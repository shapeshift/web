import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import BigNumber from 'bignumber.js'

import { getUnsignedSolanaTransaction } from '../../solana-utils/getUnsignedSolanaTransaction'
import type { SwapperApi } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'

export const butterSwapApi: SwapperApi = {
  getTradeQuote,
  getTradeRate,
  checkTradeStatus: () => {
    // TODO(gomes): Implement checkTradeStatus
    throw new Error('checkTradeStatus Not implemented')
  },
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
    if (to === undefined || value === undefined || data === undefined) {
      const undefinedRequiredValues = [to, value, data].filter(v => v === undefined)
      throw new Error('undefined required values in swap step', {
        cause: { undefinedRequiredValues },
      })
    }
    // Convert value from hex to decimal string if needed
    let valueToUse = value
    if (typeof valueToUse === 'string' && valueToUse.startsWith('0x')) {
      valueToUse = BigInt(valueToUse).toString()
    }
    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)
    const feeData = await evm.getFees({
      adapter,
      data,
      to,
      value: valueToUse,
      from,
      supportsEIP1559,
    })
    // Use the higher of the node or API gas limit if available
    return adapter.buildCustomApiTx({
      accountNumber,
      data,
      from,
      to,
      value: valueToUse,
      ...feeData,
      gasLimit: BigNumber.max(feeData.gasLimit).toFixed(),
    })
  },
  getUnsignedSolanaTransaction,
}
