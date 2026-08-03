import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'

import type { TxBuildData } from '../../types'
import { estimateGasWithStateOverride, getMinimalStateOverride, withTimeout } from './stateOverride'

type GetEvmNetworkFeeCryptoBaseUnitArgs = {
  adapter: EvmChainAdapter
  supportsEIP1559: boolean
} & ( // Rate network fee: only a provider gas limit is known (there's no executable tx data), so price it
  | { gasLimit: string }
  // Executable quote: price the provider gas limit set on the tx data, or estimate and set one
  | {
      transactionData: Extract<TxBuildData, { type: 'evm' }>
      from: string
      // Estimated limits carry a safety margin against state moving before execution (an OOG
      // revert burns the full limit, an oversized one refunds); provider limits are never buffered
      gasLimitBuffer?: number
      // Overrides insufficient allowance/balance at estimation time so pre-approval and unfunded
      // sells still estimate; spenderAddress is the step's allowanceContract ('' or absent = none)
      stateOverride?: {
        sellAsset: Asset
        sellAmountCryptoBaseUnit: string
        spenderAddress?: string
      }
    }
)

export const getEvmNetworkFeeCryptoBaseUnit = async (
  args: GetEvmNetworkFeeCryptoBaseUnitArgs,
): Promise<string> => {
  const { adapter, supportsEIP1559 } = args

  // Price a provider gas limit with fresh gas prices - no on chain estimation
  const priceProviderGasLimit = async (gasLimit: string): Promise<string> => {
    const { average: gasPrices } = await adapter.getGasFeeData()
    return evm.calcNetworkFeeCryptoBaseUnit({ ...gasPrices, supportsEIP1559, gasLimit })
  }

  // Rate network fee: the caller passed a provider gas limit directly
  if (!('transactionData' in args)) return priceProviderGasLimit(args.gasLimit)

  const { transactionData, from, gasLimitBuffer = 1.2 } = args

  // Executable quote: the provider supplied a gas limit on the tx data, price it as-is
  const providerGasLimit = transactionData.gasLimit
  if (providerGasLimit && bnOrZero(providerGasLimit).gt(0)) {
    return priceProviderGasLimit(providerGasLimit)
  }

  const { to, data, value } = transactionData

  if (args.stateOverride) {
    const { sellAsset, sellAmountCryptoBaseUnit, spenderAddress } = args.stateOverride

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
    )

    if (overriddenGasLimit) {
      transactionData.gasLimit = bnOrZero(overriddenGasLimit).times(gasLimitBuffer).toFixed(0)
      return priceProviderGasLimit(overriddenGasLimit)
    }
  }

  // Estimate on chain, then set the buffered limit on the tx data in place so the executable tx
  // always carries a gas limit
  const estimatedFees = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })
  transactionData.gasLimit = bnOrZero(estimatedFees.gasLimit).times(gasLimitBuffer).toFixed(0)

  return estimatedFees.networkFeeCryptoBaseUnit
}
