import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import BigNumber from 'bignumber.js'

import type { SwapperApi } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { checkTradeStatus } from './swapperApi/checkTradeStatus'
import { getButterQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'

export const butterSwapApi: SwapperApi = {
  getTradeQuote: getButterQuote,
  getTradeRate,
  checkTradeStatus,
  getUnsignedEvmTransaction: async args => {
    const { from, stepIndex, tradeQuote, supportsEIP1559, assertGetEvmChainAdapter } = args
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')
    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    const { sellAsset, butterSwapTransactionMetadata } = step
    const { chainNamespace } = fromChainId(sellAsset.chainId)
    if (chainNamespace !== CHAIN_NAMESPACE.Evm) {
      throw new Error(`getUnsignedEvmTransaction called for non-EVM chain: ${chainNamespace}`)
    }
    const { accountNumber } = step
    if (!butterSwapTransactionMetadata) throw new Error('Transaction metadata is required')
    const { to, value, data } = butterSwapTransactionMetadata
    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)
    const feeData = await evm.getFees({
      adapter,
      data,
      to,
      value: BigInt(value).toString(),
      from,
      supportsEIP1559,
    })

    return adapter.buildCustomApiTx({
      accountNumber,
      data,
      from,
      to,
      value: BigInt(value).toString(),
      ...feeData,
      gasLimit: BigNumber.max(feeData.gasLimit).toFixed(),
    })
  },
}
