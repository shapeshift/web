import { solanaChainId } from '@shapeshiftoss/caip'

import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../evm-utils'
import type {
  GetEvmTradeQuoteInputBase,
  GetEvmTradeRateInput,
  GetSolanaTradeQuoteInput,
  GetSolanaTradeRateInput,
  SwapperApi,
} from '../../types'
import {
  checkEvmSwapStatus,
  checkSolanaSwapStatus,
  getExecutableTradeStep,
  getSwapMetadata,
  isExecutableTradeQuote,
} from '../../utils'
import { getBebopSolanaTradeQuote } from './getBebopSolanaTradeQuote/getBebopSolanaTradeQuote'
import { getBebopSolanaTradeRate } from './getBebopSolanaTradeRate/getBebopSolanaTradeRate'
import { getBebopTradeQuote } from './getBebopTradeQuote/getBebopTradeQuote'
import { getBebopTradeRate } from './getBebopTradeRate/getBebopTradeRate'

export const bebopApi: SwapperApi = {
  getTradeQuote: (input, deps) => {
    if (input.sellAsset.chainId === solanaChainId) {
      return getBebopSolanaTradeQuote(input as GetSolanaTradeQuoteInput, deps)
    }

    return getBebopTradeQuote(input as GetEvmTradeQuoteInputBase, deps)
  },
  getTradeRate: (input, deps) => {
    if (input.sellAsset.chainId === solanaChainId) {
      return getBebopSolanaTradeRate(input as GetSolanaTradeRateInput, deps)
    }

    return getBebopTradeRate(input as GetEvmTradeRateInput, deps)
  },
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  getUnsignedSolanaMessage: ({ tradeQuote, stepIndex }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { bebopSolanaSerializedTx } = step
    const { quoteId } = getSwapMetadata(step.swapperMetadata, 'bebop')
    if (!bebopSolanaSerializedTx || !quoteId) {
      throw new Error('Bebop Solana transaction metadata is required')
    }

    return Promise.resolve({
      serializedTx: bebopSolanaSerializedTx,
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
