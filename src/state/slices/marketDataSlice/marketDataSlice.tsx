import { createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react'
import { AssetId } from '@shapeshiftoss/caip'
import { findAll, findByAssetId, findPriceHistoryByAssetId } from '@shapeshiftoss/market-service'
import { HistoryData, HistoryTimeframe, MarketCapResult, MarketData } from '@shapeshiftoss/types'

export type PriceHistoryData = {
  [k: AssetId]: HistoryData[]
}

type PriceHistoryByTimeframe = {
  [k in HistoryTimeframe]: PriceHistoryData
}

export type MarketDataState = {
  loading: boolean // remove this, if selector returns null we don't have it
  byId: {
    [k: AssetId]: MarketData
  }
  ids: AssetId[]
  priceHistory: PriceHistoryByTimeframe
}

const initialPriceHistory: PriceHistoryByTimeframe = {
  [HistoryTimeframe.HOUR]: {},
  [HistoryTimeframe.DAY]: {},
  [HistoryTimeframe.WEEK]: {},
  [HistoryTimeframe.MONTH]: {},
  [HistoryTimeframe.YEAR]: {},
  [HistoryTimeframe.ALL]: {},
}

const initialState: MarketDataState = {
  byId: {},
  ids: [],
  priceHistory: initialPriceHistory,
  loading: false,
}

export const marketData = createSlice({
  name: 'marketData',
  initialState,
  reducers: {
    clear: () => initialState,
    setMarketData: (state, { payload }) => {
      state.byId = { ...state.byId, ...payload } // upsert
      const ids = Array.from(new Set([...state.ids, ...Object.keys(payload)]))
      state.ids = ids // upsert unique
    },
    setPriceHistory: (
      state,
      {
        payload: { data, args },
      }: { payload: { data: HistoryData[]; args: FindPriceHistoryByAssetIdArgs } },
    ) => {
      const { assetId, timeframe } = args
      state.priceHistory[timeframe][assetId] = data
    },
  },
})

type FindPriceHistoryByAssetIdArgs = { assetId: AssetId; timeframe: HistoryTimeframe }

export const marketApi = createApi({
  reducerPath: 'marketApi',
  // not actually used, only used to satisfy createApi, we use a custom queryFn
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  // refetch if network connection is dropped, useful for mobile
  refetchOnReconnect: true,
  endpoints: build => ({
    findAll: build.query<MarketCapResult, void>({
      // top 1000 assets
      queryFn: async () => ({ data: await findAll({ count: 1000 }) }),
      onCacheEntryAdded: async (_args, { dispatch, cacheDataLoaded, getCacheEntry }) => {
        await cacheDataLoaded
        const data = getCacheEntry().data
        data && dispatch(marketData.actions.setMarketData(data))
      },
    }),
    findByAssetId: build.query<MarketCapResult, AssetId>({
      queryFn: async (assetId: AssetId, baseQuery) => {
        try {
          const currentMarketData = await findByAssetId({ assetId })
          if (!currentMarketData) throw new Error()
          const data = { [assetId]: currentMarketData }
          // dispatching new market data, this is done here instead of it being done in onCacheEntryAdded
          // to prevent edge cases like #858
          baseQuery.dispatch(marketData.actions.setMarketData(data))
          return { data }
        } catch (e) {
          const error = { data: `findByAssetId: no market data for ${assetId}`, status: 404 }
          return { error }
        }
      },
    }),
    findPriceHistoryByAssetId: build.query<HistoryData[], FindPriceHistoryByAssetIdArgs>({
      queryFn: async ({ assetId, timeframe }) => {
        try {
          const data = await findPriceHistoryByAssetId({ timeframe, assetId })
          return { data }
        } catch (e) {
          const error = {
            data: `findPriceHistoryByAssetId: error fetching price history for ${assetId}`,
            status: 400,
          }
          return { error }
        }
      },
      onQueryStarted: async (args, { dispatch, queryFulfilled, getCacheEntry }) => {
        // empty data helps selectors know it's loaded, even if it's unavailable
        const data: HistoryData[] = []
        const payload = { data, args }
        try {
          await queryFulfilled
          const data = getCacheEntry().data
          payload.data = data ?? []
        } catch (e) {
          // swallow
        } finally {
          dispatch(marketData.actions.setPriceHistory(payload))
        }
      },
    }),
  }),
})

export const { useFindAllQuery, useFindByAssetIdQuery, useFindPriceHistoryByAssetIdQuery } =
  marketApi
