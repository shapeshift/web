import { Err } from '@sniptt/monads'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { cowApi } from 'lib/swapper/swappers/CowSwapper/endpoints'
import type { QuoteHelperType } from 'state/apis/swappers/types'
import { selectUsdRateByAssetId } from 'state/slices/marketDataSlice/selectors'

export const getCowTradeQuoteHelper: QuoteHelperType = async (getTradeQuoteInput, state) => {
  const sellAssetUsdRate = selectUsdRateByAssetId(state, getTradeQuoteInput.sellAsset.assetId)
  const buyAssetUsdRate = selectUsdRateByAssetId(state, getTradeQuoteInput.buyAsset.assetId)

  if (!sellAssetUsdRate)
    return Err(
      makeSwapErrorRight({
        message: '[CowSwapper: getCowTradeQuoteHelper] - missing sellAssetUsdRate',
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )

  if (!buyAssetUsdRate)
    return Err(
      makeSwapErrorRight({
        message: '[CowSwapper: getCowTradeQuoteHelper] - missing buyAssetUsdRate',
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )
  const maybeQuote = await cowApi.getTradeQuote(getTradeQuoteInput, {
    sellAssetUsdRate,
    buyAssetUsdRate,
  })
  return maybeQuote
}
