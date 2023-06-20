import type { AssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads/build'
import type { Asset } from 'lib/asset-service'
import type { GetEvmTradeQuoteInput, GetTradeQuoteInput, SwapErrorRight } from 'lib/swapper/api'
import { lifi } from 'lib/swapper/swappers/LifiSwapper/LifiSwapper2'
import type { LifiTradeQuote } from 'lib/swapper/swappers/LifiSwapper/utils/types'
import type { ReduxState } from 'state/reducer'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { selectUsdRateByAssetId } from 'state/slices/marketDataSlice/selectors'

import { swappersApi } from './swappersApi'

export const lifiSwapperApi = swappersApi.injectEndpoints({
  endpoints: build => ({
    getLifiTradeQuote: build.query<
      Result<LifiTradeQuote<false>, SwapErrorRight>,
      GetTradeQuoteInput
    >({
      queryFn: async (getTradeQuoteInput: GetEvmTradeQuoteInput, { getState }) => {
        const state: ReduxState = getState() as ReduxState
        const assets: Partial<Record<AssetId, Asset>> = selectAssets(state)
        const sellAssetUsdRate = selectUsdRateByAssetId(state, getTradeQuoteInput.sellAsset.assetId)
        if (!sellAssetUsdRate)
          return {
            error: `no market data available for assetId ${getTradeQuoteInput.sellAsset.assetId}`,
          }
        const maybeQuote = await lifi.getTradeQuote(getTradeQuoteInput, assets, sellAssetUsdRate)
        return { data: maybeQuote }
      },
    }),
  }),
})

export const { useGetLifiTradeQuoteQuery } = lifiSwapperApi
