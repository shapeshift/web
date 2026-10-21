import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'

import type { TxBuildData } from '../../types'
import { estimateGasWithStateOverride, getMinimalStateOverride, withTimeout } from './stateOverride'

export const EVM_GAS_LIMIT_BUFFER = 1.2

export const bufferGasLimit = (gasLimit: string): string =>
  bnOrZero(gasLimit).times(EVM_GAS_LIMIT_BUFFER).toFixed(0)

const isPositiveGasLimit = (gasLimit: string | null | undefined): gasLimit is string =>
  bnOrZero(gasLimit).gt(0)

type EvmFeeArgs = {
  adapter: EvmChainAdapter
  supportsEIP1559: boolean
}

type EvmSimulationArgs = {
  transactionData: Extract<TxBuildData, { type: 'evm' }>
  from: string
  // Patches missing allowance/balance so unapproved or unfunded sells still estimate
  stateOverride?: {
    sellAsset: Asset
    sellAmountCryptoBaseUnit: string
    spenderAddress?: string
  }
}

// Priced as-is: swapper constants, or a limit the caller already buffered
type FixedGasLimitArgs = { gasLimit: string }

// Estimates and sets the buffered limit on the tx data
type SimulatedGasLimitArgs = EvmSimulationArgs & {
  // Buffered fallback when missing state can't be overridden, so the tx can't be simulated
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

// Prices the buffered limit, since that's what the signer must hold to broadcast
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

    // null = the override couldn't be built (undiscoverable slot or failed read)
    const stateOverride = await withTimeout(getMinimalStateOverride(overrideArgs)).catch(() => null)

    if (stateOverride === null && isPositiveGasLimit(providerGasLimit)) {
      transactionData.gasLimit = bufferGasLimit(providerGasLimit)
      return priceGasLimit(args, transactionData.gasLimit)
    }

    // An rpc without stateOverride support falls through to plain estimation
    const overriddenGasLimit = stateOverride
      ? await estimateGasWithStateOverride({ ...overrideArgs, to, data, stateOverride }).catch(
          () => undefined,
        )
      : undefined

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

// Rates price a buffered provider limit before simulating, so they compare with simulated rates
export const getEvmRateNetworkFeeCryptoBaseUnit = ({
  providerGasLimit,
  simulation,
  ...feeArgs
}: GetEvmRateNetworkFeeCryptoBaseUnitArgs): Promise<string> => {
  if (isPositiveGasLimit(providerGasLimit)) {
    return priceGasLimit(feeArgs, bufferGasLimit(providerGasLimit))
  }

  if (simulation) return getEvmNetworkFeeCryptoBaseUnit({ ...feeArgs, ...simulation })

  return Promise.reject(new Error('no gas limit to price'))
}
