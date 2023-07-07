import { Err } from '@sniptt/monads'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { zrxApi } from 'lib/swapper/swappers/ZrxSwapper/endpoints'
import type { QuoteHelperType } from 'state/apis/swappers/types'
import { selectUsdRateByAssetId } from 'state/slices/marketDataSlice/selectors'

export const getZrxTradeQuoteHelper: QuoteHelperType = async (getTradeQuoteInput, state) => {
  const sellAssetUsdRate = selectUsdRateByAssetId(state, getTradeQuoteInput.sellAsset.assetId)

  if (!sellAssetUsdRate)
    return Err(
      makeSwapErrorRight({
        message: '[ZrxSwapper: getZrxTradeQuoteHelper] - missing sellAssetUsdRate',
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )

  const maybeQuote = await zrxApi.getTradeQuote(getTradeQuoteInput, {
    sellAssetUsdRate,
  })
  return maybeQuote
}
