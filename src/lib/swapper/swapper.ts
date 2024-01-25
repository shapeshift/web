import type {
  GetTradeQuoteInput,
  QuoteResult,
  SwapErrorRight,
  SwapperName,
  TradeQuote,
} from '@shapeshiftoss/swapper'
import type { Asset, AssetsByIdPartial } from '@shapeshiftoss/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isSome, timeout } from 'lib/utils'

import { QUOTE_TIMEOUT_ERROR, QUOTE_TIMEOUT_MS, swappers } from './constants'

export const getTradeQuotes = async (
  getTradeQuoteInput: GetTradeQuoteInput,
  swapperName: SwapperName,
  assetsById: AssetsByIdPartial,
): Promise<QuoteResult | undefined> => {
  if (bnOrZero(getTradeQuoteInput.affiliateBps).lt(0)) return
  if (getTradeQuoteInput.sellAmountIncludingProtocolFeesCryptoBaseUnit === '0') return

  const swapper = swappers[swapperName]

  if (swapper === undefined) return

  try {
    const quote = await timeout<TradeQuote[], SwapErrorRight>(
      swapper.getTradeQuote(getTradeQuoteInput, assetsById),
      QUOTE_TIMEOUT_MS,
      QUOTE_TIMEOUT_ERROR,
    )

    return {
      ...quote,
      swapperName,
    }
  } catch (e) {
    // This should never happen but it may - we should be using monadic error handling all the way through swapper call stack
    // in case this logs an error from a rejected promise, it means we throw somewhere and forgot to handle errors the monadic way
    console.error(e)
  }
}

// TODO: this isn't a pure swapper method, see https://github.com/shapeshift/web/pull/5519
// We currently need to pass assetsById to avoid instantiating AssetService in web
// but will need to remove this second arg once this lives outside of web, to keep things pure and swappery
export const getSupportedSellAssetIds = async (
  enabledSwappers: Record<SwapperName, boolean>,
  assetsById: AssetsByIdPartial,
) => {
  const assets = Object.values(assetsById) as Asset[]
  const supportedAssetIds = await Promise.all(
    Object.entries(swappers)
      .filter(([swapperName, _]) => enabledSwappers[swapperName as SwapperName])
      .map(([_, swapper]) => swapper?.filterAssetIdsBySellable(assets))
      .filter(isSome),
  )
  return new Set(supportedAssetIds.flat())
}

// TODO: this isn't a pure swapper method, see https://github.com/shapeshift/web/pull/5519
// We currently need to pass assetsById to avoid instantiating AssetService in web
// but will need to remove this second arg once this lives outside of web, to keep things pure and swappery
export const getSupportedBuyAssetIds = async (
  enabledSwappers: Record<SwapperName, boolean>,
  sellAsset: Asset,
  assetsById: AssetsByIdPartial,
) => {
  const assets = Object.values(assetsById) as Asset[]
  const supportedAssetIds = await Promise.all(
    Object.entries(swappers)
      .filter(([swapperName, _]) => enabledSwappers[swapperName as SwapperName])
      .map(([_, swapper]) => swapper?.filterBuyAssetsBySellAssetId({ assets, sellAsset }))
      .filter(isSome),
  )
  return new Set(supportedAssetIds.flat())
}
