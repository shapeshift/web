import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'

import type { TxBuildData } from '../../types'
import { estimateGasWithStateOverride, getMinimalStateOverride, withTimeout } from './stateOverride'

// Estimated limits carry a safety margin against state moving before execution (an OOG revert
// burns the full limit, an unused one refunds)
export const EVM_GAS_LIMIT_BUFFER = 1.2

type GetEvmNetworkFeeCryptoBaseUnitArgs = {
  adapter: EvmChainAdapter
  supportsEIP1559: boolean
} & ( // Price a known gas limit (rate fallbacks, or a tx that can't be simulated before signing)
  | { gasLimit: string }
  // Executable tx data: estimate on chain and set the buffered limit on the tx data - any provider
  // gas limit is ignored, so an estimation failure throws instead of signing an unverified tx
  | {
      transactionData: Extract<TxBuildData, { type: 'evm' }>
      from: string
      // Overrides insufficient allowance/balance at estimation time so pre-approval and unfunded
      // sells still estimate; spenderAddress is the step's allowanceContract ('' or absent = none)
      stateOverride?: {
        sellAsset: Asset
        sellAmountCryptoBaseUnit: string
        spenderAddress?: string
      }
    }
)

// The fee prices the buffered limit, as that's what the signer must hold to broadcast
export const getEvmNetworkFeeCryptoBaseUnit = async (
  args: GetEvmNetworkFeeCryptoBaseUnitArgs,
): Promise<string> => {
  const { adapter, supportsEIP1559 } = args

  const priceGasLimit = async (gasLimit: string): Promise<string> => {
    const { average: gasPrices } = await adapter.getGasFeeData()
    return evm.calcNetworkFeeCryptoBaseUnit({ ...gasPrices, supportsEIP1559, gasLimit })
  }

  if (!('transactionData' in args)) return priceGasLimit(args.gasLimit)

  const { transactionData, from } = args
  const { to, data, value } = transactionData

  const bufferGasLimit = (gasLimit: string) =>
    bnOrZero(gasLimit).times(EVM_GAS_LIMIT_BUFFER).toFixed(0)

  if (args.stateOverride) {
    const { sellAsset, sellAmountCryptoBaseUnit, spenderAddress } = args.stateOverride

    // Best effort - a timeout, undiscoverable slot, or an rpc without stateOverride support falls
    // through to plain estimation, which succeeds whenever the seller's state was sufficient anyway
    const overriddenGasLimit = await withTimeout(
      (async () => {
        const overrideArgs = {
          sellAsset,
          sellAmountCryptoBaseUnit,
          from,
          spenderAddress,
          value,
        }

        const stateOverride = await getMinimalStateOverride(overrideArgs)
        if (!stateOverride) return undefined

        return estimateGasWithStateOverride({ ...overrideArgs, to, data, stateOverride })
      })(),
    ).catch(() => undefined)

    if (overriddenGasLimit) {
      transactionData.gasLimit = bufferGasLimit(overriddenGasLimit)
      return priceGasLimit(transactionData.gasLimit)
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
