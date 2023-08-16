import type { Asset } from 'lib/asset-service'
import { AssetService } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isFulfilled as isFulfilledPredicate, timeout } from 'lib/utils'

import type { GetTradeQuoteInput, SwapErrorRight, SwapperName, TradeQuote2 } from './api'
import { QUOTE_TIMEOUT_ERROR, QUOTE_TIMEOUT_MS, swappers } from './constants'
import type { QuoteResult, TradeQuoteDeps } from './types'

export { TradeExecution } from './tradeExecution'

export const getTradeQuotes = async (
  getTradeQuoteInput: GetTradeQuoteInput,
  enabledSwappers: SwapperName[],
  deps: TradeQuoteDeps,
): Promise<QuoteResult[]> => {
  if (bnOrZero(getTradeQuoteInput.affiliateBps).lt(0)) return []
  if (getTradeQuoteInput.sellAmountIncludingProtocolFeesCryptoBaseUnit === '0') return []

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

export const getSupportedSellAssetIds = async (enabledSwappers: SwapperName[]) => {
  const { assets } = new AssetService()
  const supportedAssetIds = await Promise.all(
    swappers
      .filter(({ swapperName }) => enabledSwappers.includes(swapperName))
      .map(({ swapper }) => swapper.filterAssetIdsBySellable(assets)),
  )
  return new Set(supportedAssetIds.flat())
}

export const getSupportedBuyAssetIds = async (enabledSwappers: SwapperName[], sellAsset: Asset) => {
  const { assets } = new AssetService()
  const supportedAssetIds = await Promise.all(
    swappers
      .filter(({ swapperName }) => enabledSwappers.includes(swapperName))
      .map(({ swapper }) => swapper.filterBuyAssetsBySellAssetId({ assets, sellAsset })),
  )
  return new Set(supportedAssetIds.flat())
}
