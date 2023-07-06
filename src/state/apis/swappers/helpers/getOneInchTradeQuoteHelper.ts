import { Err } from '@sniptt/monads'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { oneInchApi } from 'lib/swapper/swappers/OneInchSwapper/endpoints'
import type { QuoteHelperType } from 'state/apis/swappers/types'
import { selectUsdRateByAssetId } from 'state/slices/marketDataSlice/selectors'

export const getOneInchTradeQuoteHelper: QuoteHelperType = async (getTradeQuoteInput, state) => {
  const sellAssetUsdRate = selectUsdRateByAssetId(state, getTradeQuoteInput.sellAsset.assetId)
  const buyAssetUsdRate = selectUsdRateByAssetId(state, getTradeQuoteInput.buyAsset.assetId)

  if (!sellAssetUsdRate)
    return Err(
      makeSwapErrorRight({
        message: '[OneInchSwapper: getOneInchTradeQuoteHelper] - missing sellAssetUsdRate',
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )

  if (!buyAssetUsdRate)
    return Err(
      makeSwapErrorRight({
        message: '[ZrxSwapper: getZrxTradeQuoteHelper] - missing buyAssetUsdRate',
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )

  const maybeQuote = await oneInchApi.getTradeQuote(getTradeQuoteInput, {
    sellAssetUsdRate,
    buyAssetUsdRate,
  })
  return maybeQuote
}
