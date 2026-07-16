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
import { isSolanaChainId } from './utils/helpers/helpers'

export const bebopApi: SwapperApi = {
  getTradeQuote: async (input, { assertGetEvmChainAdapter, assetsById, config }) => {
    if (isSolanaChainId(input.sellAsset.chainId)) {
      const tradeQuoteResult = await getBebopSolanaTradeQuote(
        input as GetSolanaTradeQuoteInput,
        assetsById,
        config.VITE_BEBOP_API_KEY,
      )
      return tradeQuoteResult.map(tradeQuote => [tradeQuote])
    }

    const tradeQuoteResult = await getBebopTradeQuote(
      input as GetEvmTradeQuoteInputBase,
      assertGetEvmChainAdapter,
      assetsById,
      config.VITE_BEBOP_API_KEY,
    )

    return tradeQuoteResult.map(tradeQuote => [tradeQuote])
  },
  getTradeRate: async (input, { assertGetEvmChainAdapter, assetsById, config }) => {
    if (isSolanaChainId(input.sellAsset.chainId)) {
      const tradeRateResult = await getBebopSolanaTradeRate(
        input as GetSolanaTradeRateInput,
        assetsById,
        config.VITE_BEBOP_API_KEY,
      )
      return tradeRateResult.map(tradeRate => [tradeRate])
    }

    const tradeRateResult = await getBebopTradeRate(
      input as GetEvmTradeRateInput,
      assertGetEvmChainAdapter,
      assetsById,
      config.VITE_BEBOP_API_KEY,
    )

    return tradeRateResult.map(tradeRate => [tradeRate])
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
