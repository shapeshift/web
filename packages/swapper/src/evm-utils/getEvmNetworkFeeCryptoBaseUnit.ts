import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import { bnOrZero } from '@shapeshiftoss/utils'

import type { TxBuildData } from '../types'

type GetEvmNetworkFeeCryptoBaseUnitArgs = {
  adapter: EvmChainAdapter
  supportsEIP1559: boolean
} & ( // Rate network fee: only a provider gas limit is known (there's no executable tx data), so price it
  | { gasLimit: string }
  // Executable quote: price the provider gas limit baked onto the tx data, or estimate and bake one
  | {
      transactionData: Extract<TxBuildData, { type: 'evm' }>
      from: string
      gasLimitBuffer?: number
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

  const { transactionData, from, gasLimitBuffer = 1 } = args

  // Executable quote: the provider already baked a gas limit onto the tx data, price it as-is
  const providerGasLimit = transactionData.gasLimit
  if (providerGasLimit && bnOrZero(providerGasLimit).gt(0)) {
    return priceProviderGasLimit(providerGasLimit)
  }

  // Executable quote with no provider gas limit: estimate on chain, then bake the buffered limit onto
  // the tx data in place so the executable tx always carries a gas limit
  const { to, data, value } = transactionData
  const estimatedFees = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })
  transactionData.gasLimit = bnOrZero(estimatedFees.gasLimit).times(gasLimitBuffer).toFixed(0)

  return estimatedFees.networkFeeCryptoBaseUnit
}
