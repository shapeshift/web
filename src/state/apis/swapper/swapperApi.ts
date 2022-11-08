import type { AssetId, ChainId } from '@keepkey/caip'
import type { GetTradeQuoteInput, TradeQuote } from '@keepkey/swapper'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
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

export type GetUsdRatesArgs = {
  feeAssetId: AssetId
  buyAssetId: AssetId
  sellAssetId: AssetId
}

type GetUsdRatesReturn = {
  buyAssetUsdRate: string
  sellAssetUsdRate: string
  feeAssetUsdRate: string
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
    getUsdRates: build.query<GetUsdRatesReturn, GetUsdRatesArgs>({
      queryFn: async ({ feeAssetId, buyAssetId, sellAssetId }, { getState }) => {
        const state: State = getState() as unknown as State // ReduxState causes circular dependency
        const {
          assets,
          preferences: { featureFlags },
        } = state
        try {
          const swapper = await getBestSwapperFromArgs(buyAssetId, sellAssetId, featureFlags)
          const feeAsset = assets.byId[feeAssetId]
          const buyAsset = assets.byId[buyAssetId]
          const sellAsset = assets.byId[sellAssetId]
          const [feeAssetUsdRate, buyAssetUsdRate, sellAssetUsdRate] = await Promise.all([
            swapper.getUsdRate(feeAsset),
            swapper.getUsdRate(buyAsset),
            swapper.getUsdRate(sellAsset),
          ])
          const data = { feeAssetUsdRate, buyAssetUsdRate, sellAssetUsdRate }
          return { data }
        } catch (e) {
          return {
            error: {
              error: 'getUsdRates: error fetching USD rates',
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

export const { useGetUsdRateQuery, useGetTradeQuoteQuery, useGetUsdRatesQuery } = swapperApi
