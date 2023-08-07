import type { AssetId } from '@shapeshiftoss/caip'
import { AssetService } from 'lib/asset-service'
import { isFulfilled as isFulfilledPredicate, timeout } from 'lib/utils'

import type { GetTradeQuoteInput, SwapErrorRight, SwapperName, TradeQuote2 } from './api'
import { QUOTE_TIMEOUT_ERROR, QUOTE_TIMEOUT_MS, swappers } from './constants'
import type { QuoteResult, TradeQuoteDeps } from './types'

export { TradeExecution } from './tradeExecution'

// gets trade quotes
export const getTradeQuotes = async (
  getTradeQuoteInput: GetTradeQuoteInput,
  enabledSwappers: SwapperName[],
  deps: TradeQuoteDeps,
): Promise<QuoteResult[]> => {
  const quotes = await Promise.allSettled(
    swappers
      .filter(({ swapperName }) => enabledSwappers.includes(swapperName))
      .map(({ swapperName, swapper }) =>
        timeout<TradeQuote2, SwapErrorRight>(
          swapper.getTradeQuote(getTradeQuoteInput, deps),
          QUOTE_TIMEOUT_MS,
          QUOTE_TIMEOUT_ERROR,
        ).then(quote => ({
          ...quote,
          swapperName,
        })),
      ),
  )

  // This should never happen but it may - we should be using monadic error handling all the way through swapper call stack
  // in case this logs an error from a rejected promise, it means we throw somewhere and forgot to handle errors the monadic way
  const successfulQuotes = quotes
    .filter(result => {
      const isFulfilled = isFulfilledPredicate(result)
      if (!isFulfilled) {
        console.error(result.reason)
      }
      return isFulfilled
    })
    .map(result => (result as PromiseFulfilledResult<QuoteResult>).value)

  return successfulQuotes
}

export const getSupportedSellAssets = async (enabledSwappers: SwapperName[]) => {
  const assetIds = new AssetService().allIds
  const supportedAssetIds = await Promise.all(
    swappers
      .filter(({ swapperName }) => enabledSwappers.includes(swapperName))
      .map(({ swapper }) => swapper.filterAssetIdsBySellable(assetIds)),
  )
  return new Set(supportedAssetIds.flat())
}

export const getSupportedBuyAssets = async (
  enabledSwappers: SwapperName[],
  sellAssetId: AssetId,
) => {
  const nonNftAssetIds = new AssetService().allIds
  const supportedAssetIds = await Promise.all(
    swappers
      .filter(({ swapperName }) => enabledSwappers.includes(swapperName))
      .map(({ swapper }) => swapper.filterBuyAssetsBySellAssetId({ nonNftAssetIds, sellAssetId })),
  )
  return new Set(supportedAssetIds.flat())
}
