import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { GetTradeQuoteInput, TradeQuote } from '@shapeshiftoss/swapper'
import { getBestSwapperFromArgs } from 'components/Trade/hooks/useSwapper/utils'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import type { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import type { Preferences } from 'state/slices/preferencesSlice/preferencesSlice'

export type GetUsdRateArgs = {
  rateAssetId: AssetId
  buyAssetId: AssetId
  sellAssetId: AssetId
}

type GetUsdRateReturn = {
  usdRate: string
}

type State = {
  assets: AssetsState
  preferences: Preferences
}

type GetTradeQuoteReturn = TradeQuote<ChainId>

export const swapperApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'swapperApi',
  endpoints: build => ({
    getUsdRate: build.query<GetUsdRateReturn, GetUsdRateArgs>({
      queryFn: async ({ rateAssetId, buyAssetId, sellAssetId }, { getState }) => {
        const state: State = getState() as unknown as State // ReduxState causes circular dependency
        const {
          assets,
          preferences: { featureFlags },
        } = state
        try {
          const swapper = await getBestSwapperFromArgs(buyAssetId, sellAssetId, featureFlags)
          const rateAsset = assets.byId[rateAssetId]
          const usdRate = await swapper.getUsdRate(rateAsset)
          const data = { usdRate }
          return { data }
        } catch (e) {
          return {
            error: {
              error: 'getUsdRate: error fetching usd rate',
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
    getTradeQuote: build.query<GetTradeQuoteReturn, GetTradeQuoteInput>({
      queryFn: async (args, { getState }) => {
        const { sellAsset, buyAsset } = args
        const state: State = getState() as unknown as State // ReduxState causes circular dependency
        const {
          preferences: { featureFlags },
        } = state
        try {
          const swapper = await getBestSwapperFromArgs(
            buyAsset.assetId,
            sellAsset.assetId,
            featureFlags,
          )
          const tradeQuote = await swapper.getTradeQuote(args)
          return { data: tradeQuote }
        } catch (e) {
          return {
            error: {
              error: 'getTradeQuote: error fetching trade quote',
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
  }),
})

export const { useGetUsdRateQuery, useGetTradeQuoteQuery } = swapperApi
