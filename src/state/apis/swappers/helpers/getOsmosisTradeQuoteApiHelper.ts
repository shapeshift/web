import { Err } from '@sniptt/monads'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { osmosisApi } from 'lib/swapper/swappers/OsmosisSwapper/endpoints'
import type { QuoteHelperType } from 'state/apis/swappers/types'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { selectUsdRateByAssetId } from 'state/slices/marketDataSlice/selectors'

export const getOsmosisTradeQuoteHelper: QuoteHelperType = async (getTradeQuoteInput, state) => {
  const feeAsset = selectFeeAssetById(state, getTradeQuoteInput.sellAsset.assetId)

  const sellAssetUsdRate = selectUsdRateByAssetId(state, getTradeQuoteInput.sellAsset.assetId)
  const buyAssetUsdRate = selectUsdRateByAssetId(state, getTradeQuoteInput.buyAsset.assetId)
  const feeAssetUsdRate = feeAsset ? selectUsdRateByAssetId(state, feeAsset.assetId) : undefined

  if (!sellAssetUsdRate)
    return Err(
      makeSwapErrorRight({
        message: '[OsmosisSwapper: getOsmosisTradeQuoteHelper] - missing sellAssetUsdRate',
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )

  if (!buyAssetUsdRate)
    return Err(
      makeSwapErrorRight({
        message: '[OsmosisSwapper: getOsmosisTradeQuoteHelper] - missing buyAssetUsdRate',
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )

  if (!feeAssetUsdRate)
    return Err(
      makeSwapErrorRight({
        message: '[OsmosisSwapper: getOsmosisTradeQuoteHelper] - missing feeAssetUsdRate',
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )

  const maybeQuote = await osmosisApi.getTradeQuote(getTradeQuoteInput, {
    sellAssetUsdRate,
    buyAssetUsdRate,
    feeAssetUsdRate,
  })
  return maybeQuote
}
