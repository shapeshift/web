import { solanaChainId } from '@shapeshiftoss/caip'

import type { SwapperApi } from '../../types'
import {
  checkEvmSwapStatus,
  checkSolanaSwapStatus,
  getExecutableTradeStep,
  getSwapMetadata,
  isExecutableTradeQuote,
} from '../../utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getBebopSolanaTradeQuote } from './getBebopSolanaTradeQuote/getBebopSolanaTradeQuote'
import { getBebopSolanaTradeRate } from './getBebopSolanaTradeRate/getBebopSolanaTradeRate'
import { getBebopTradeQuote } from './getBebopTradeQuote/getBebopTradeQuote'
import { getBebopTradeRate } from './getBebopTradeRate/getBebopTradeRate'
import type { BebopTradeQuoteInput, BebopTradeRateInput } from './types'

export const bebopApi: SwapperApi = {
  getTradeQuote: (input, deps) => {
    const quoteInput = input as BebopTradeQuoteInput

    return 'supportsEIP1559' in quoteInput
      ? getBebopTradeQuote(quoteInput, deps)
      : getBebopSolanaTradeQuote(quoteInput, deps)
  },
  getTradeRate: (input, deps) => {
    const rateInput = input as BebopTradeRateInput

    return 'supportsEIP1559' in rateInput
      ? getBebopTradeRate(rateInput, deps)
      : getBebopSolanaTradeRate(rateInput, deps)
  },
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  getUnsignedSolanaMessage: ({ tradeQuote, stepIndex }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { transactionData } = step
    const { quoteId } = getSwapMetadata(step.swapperMetadata, 'bebop')
    if (transactionData?.type !== 'solana_serialized_tx' || !quoteId) {
      throw new Error('Bebop Solana transaction data is required')
    }

    return Promise.resolve({
      serializedTx: transactionData.serializedTx,
      quoteId,
    })
  },
  checkTradeStatus: input => {
    if (input.chainId === solanaChainId) {
      return checkSolanaSwapStatus({
        txHash: input.txHash,
        address: input.address,
        assertGetSolanaChainAdapter: input.assertGetSolanaChainAdapter,
      })
    }

    return checkEvmSwapStatus(input)
  },
}
