import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'

import type { TxBuildData } from '../../types'
import {
  estimateGasWithStateOverride,
  EstimationTimeoutError,
  getMinimalStateOverride,
  withTimeout,
} from './stateOverride'

export const EVM_GAS_LIMIT_BUFFER = 1.2

export const bufferGasLimit = (gasLimit: string): string =>
  bnOrZero(gasLimit).times(EVM_GAS_LIMIT_BUFFER).toFixed(0)

export const isPositiveGasLimit = (gasLimit: string | null | undefined): gasLimit is string =>
  bnOrZero(gasLimit).gt(0)

type EvmFeeArgs = {
  adapter: EvmChainAdapter
  supportsEIP1559: boolean
}

type EvmSimulationArgs = {
  transactionData: Extract<TxBuildData, { type: 'evm' }>
  from: string
  // Overrides missing allowance or balance so unapproved or unfunded sells can still be estimated
  stateOverride?: {
    sellAsset: Asset
    sellAmountCryptoBaseUnit: string
    spenderAddress?: string
  }
}

// A swapper constant or an already buffered limit, priced as-is
type FixedGasLimitArgs = { gasLimit: string }

// Simulates the tx and sets the buffered estimate as its gas limit
type SimulatedGasLimitArgs = EvmSimulationArgs & {
  // Used, buffered, only when missing state can't be overridden and the tx can't be simulated
  providerGasLimit?: string | null
}

type GetEvmNetworkFeeCryptoBaseUnitArgs = EvmFeeArgs & (FixedGasLimitArgs | SimulatedGasLimitArgs)

const priceGasLimit = async (
  { adapter, supportsEIP1559 }: EvmFeeArgs,
  gasLimit: string,
): Promise<string> => {
  const { average: gasPrices } = await adapter.getGasFeeData()
  return evm.calcNetworkFeeCryptoBaseUnit({ ...gasPrices, supportsEIP1559, gasLimit })
}

// Prices the buffered limit, since the signer must hold enough to cover the full limit
export const getEvmNetworkFeeCryptoBaseUnit = async (
  args: GetEvmNetworkFeeCryptoBaseUnitArgs,
): Promise<string> => {
  const { adapter, supportsEIP1559 } = args

  if (!('transactionData' in args)) return priceGasLimit(args, args.gasLimit)

  const { transactionData, from, providerGasLimit } = args
  const { to, data, value } = transactionData

  if (args.stateOverride) {
    const { sellAsset, sellAmountCryptoBaseUnit, spenderAddress } = args.stateOverride
    const overrideArgs = { sellAsset, sellAmountCryptoBaseUnit, from, spenderAddress, value }

    // null when the override can't be built (an undiscoverable storage slot or a failed read),
    // undefined when nothing needs overriding or the simulation timed out
    const overriddenGasLimit = await withTimeout(
      getMinimalStateOverride(overrideArgs).then(
        stateOverride =>
          stateOverride &&
          estimateGasWithStateOverride({ ...overrideArgs, to, data, stateOverride }),
        () => null,
      ),
    ).catch(error => {
      // The missing state makes a plain estimate revert too, so only a timeout falls through to it
      if (error instanceof EstimationTimeoutError) return undefined
      throw error
    })

    if (overriddenGasLimit === null && isPositiveGasLimit(providerGasLimit)) {
      transactionData.gasLimit = bufferGasLimit(providerGasLimit)
      return priceGasLimit(args, transactionData.gasLimit)
    }

    if (overriddenGasLimit) {
      transactionData.gasLimit = bufferGasLimit(overriddenGasLimit)
      return priceGasLimit(args, transactionData.gasLimit)
    }
  }

  const {
    average: { chainSpecific: feeData },
  } = await adapter.getFeeData({ to, value, chainSpecific: { from, data } })

  transactionData.gasLimit = bufferGasLimit(feeData.gasLimit)

  return evm.calcNetworkFeeCryptoBaseUnit({
    ...feeData,
    supportsEIP1559,
    gasLimit: transactionData.gasLimit,
  })
}

type GetEvmRateNetworkFeeCryptoBaseUnitArgs = EvmFeeArgs & {
  providerGasLimit: string | null | undefined
  simulation?: EvmSimulationArgs
}

// Rates price a provider's limit as given (it carries its own margin) and simulate without one
export const getEvmRateNetworkFeeCryptoBaseUnit = ({
  providerGasLimit,
  simulation,
  ...feeArgs
}: GetEvmRateNetworkFeeCryptoBaseUnitArgs): Promise<string> => {
  if (isPositiveGasLimit(providerGasLimit)) {
    return priceGasLimit(feeArgs, providerGasLimit)
  }

  if (simulation) return getEvmNetworkFeeCryptoBaseUnit({ ...feeArgs, ...simulation })

  return Promise.reject(new Error('no gas limit to price'))
}
