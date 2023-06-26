import type { AssetId } from '@shapeshiftoss/caip'
import { Err } from '@sniptt/monads'
import type { Asset } from 'lib/asset-service'
import type { GetEvmTradeQuoteInput } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { lifiApi } from 'lib/swapper/swappers/LifiSwapper/endpoints'
import type { QuoteHelperType } from 'state/apis/swappers/types'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { selectUsdRateByAssetId } from 'state/slices/marketDataSlice/selectors'

export const getLifiTradeQuoteHelper: QuoteHelperType = async (getTradeQuoteInput, state) => {
  const assets: Partial<Record<AssetId, Asset>> = selectAssets(state)
  const sellAssetUsdRate = selectUsdRateByAssetId(state, getTradeQuoteInput.sellAsset.assetId)

  if (!sellAssetUsdRate)
    return Err(
      makeSwapErrorRight({
        message: '[THORSwapper: getThorTradeQuoteHelper] - missing sellAssetUsdRate',
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )

  const maybeQuote = await lifiApi.getTradeQuote(
    getTradeQuoteInput as GetEvmTradeQuoteInput,
    assets,
    sellAssetUsdRate,
  )
  return maybeQuote
}
