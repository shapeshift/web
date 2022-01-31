import { createSelector, createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { findAll, findByCaip19, findPriceHistoryByCaip19 } from '@shapeshiftoss/market-service'
import { HistoryData, HistoryTimeframe, MarketCapResult, MarketData } from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import { ReduxState } from 'state/reducer'

export type PriceHistoryData = {
  [k: CAIP19]: HistoryData[]
}

type PriceHistoryByTimeframe = {
  [k in HistoryTimeframe]: PriceHistoryData
}

export type MarketDataState = {
  loading: boolean // remove this, if selector returns null we don't have it
  byId: {
    [k: CAIP19]: MarketData
  }
  ids: CAIP19[]
  priceHistory: PriceHistoryByTimeframe
}

const initialPriceHistory: PriceHistoryByTimeframe = {
  [HistoryTimeframe.HOUR]: {},
  [HistoryTimeframe.DAY]: {},
  [HistoryTimeframe.WEEK]: {},
  [HistoryTimeframe.MONTH]: {},
  [HistoryTimeframe.YEAR]: {},
  [HistoryTimeframe.ALL]: {}
}

const initialState: MarketDataState = {
  byId: {},
  ids: [],
  priceHistory: initialPriceHistory,
  loading: false
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
        payload: { data, args }
      }: { payload: { data: HistoryData[]; args: FindPriceHistoryByCaip19Args } }
    ) => {
      const { assetId, timeframe } = args
      state.priceHistory[timeframe][assetId] = data
    }
  }
})

type FindPriceHistoryByCaip19Args = { assetId: CAIP19; timeframe: HistoryTimeframe }

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
      }
    }),
    findByCaip19: build.query<MarketCapResult, CAIP19>({
      queryFn: async (caip19: CAIP19, baseQuery) => {
        try {
          const currentMarketData = await findByCaip19({ caip19 })
          if (!currentMarketData) throw new Error()
          const data = { [caip19]: currentMarketData }
          // dispatching new market data, this is done here instead of it being done in onCacheEntryAdded
          // to prevent edge cases like #858
          baseQuery.dispatch(marketData.actions.setMarketData(data))
          return { data }
        } catch (e) {
          const error = { data: `findByCaip19: no market data for ${caip19}`, status: 404 }
          return { error }
        }
      }
    }),
    findPriceHistoryByCaip19: build.query<HistoryData[], FindPriceHistoryByCaip19Args>({
      queryFn: async ({ assetId, timeframe }) => {
        try {
          const data = await findPriceHistoryByCaip19({ timeframe, caip19: assetId })
          return { data }
        } catch (e) {
          const error = {
            data: `findPriceHistoryByCaip19: error fetching price history for ${assetId}`,
            status: 400
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
      }
    })
  })
})

export const { useFindAllQuery, useFindByCaip19Query, useFindPriceHistoryByCaip19Query } = marketApi

export const selectMarketData = (state: ReduxState) => state.marketData.byId

const selectAssetId = (_state: ReduxState, assetId: CAIP19, ...args: any[]) => assetId

export const selectMarketDataById = createSelector(
  selectMarketData,
  selectAssetId,
  (marketData, assetId) => marketData[assetId]
)

// assets we have loaded market data for
export const selectMarketDataIds = (state: ReduxState) => state.marketData.ids

// if we don't have it it's loading
export const selectMarketDataLoadingById = createSelector(
  selectMarketDataById,
  (assetMarketData): boolean => isEmpty(assetMarketData)
)

export const selectPriceHistory = (state: ReduxState) => state.marketData.priceHistory

export const selectPriceHistoryByAssetTimeframe = createSelector(
  selectPriceHistory,
  selectAssetId,
  (_state: ReduxState, _assetId: CAIP19, timeframe: HistoryTimeframe) => timeframe,
  (priceHistory, assetId, timeframe) => priceHistory[timeframe][assetId] ?? []
)

export const selectPriceHistoriesLoadingByAssetTimeframe = createSelector(
  selectPriceHistory,
  (_state: ReduxState, assetIds: CAIP19[], _timeframe: HistoryTimeframe) => assetIds,
  (_state: ReduxState, _assetIds: CAIP19[], timeframe: HistoryTimeframe) => timeframe,
  // if we don't have the data it's loading
  (priceHistory, assetIds, timeframe) =>
    !assetIds.every(assetId => Boolean(priceHistory[timeframe][assetId]))
)

export const selectPriceHistoryTimeframe = createSelector(
  selectPriceHistory,
  (_state: ReduxState, timeframe: HistoryTimeframe) => timeframe,
  (priceHistory, timeframe) => priceHistory[timeframe]
)
