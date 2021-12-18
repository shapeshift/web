import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { findAll, findByCaip19, findPriceHistoryByCaip19 } from '@shapeshiftoss/market-service'
import { HistoryData, HistoryTimeframe, MarketCapResult, MarketData } from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import { bnOrZero } from 'lib/bignumber/bignumber'
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

// TODO(0xdef1cafe): put this in the marketApi, fetch individually, kill usePriceHistory hook!
export const fetchPriceHistory = createAsyncThunk(
  'marketData/priceHistory',
  async ({ assets, timeframe }: { assets: CAIP19[]; timeframe: HistoryTimeframe }) => {
    const responses = await Promise.allSettled(
      assets.map(async asset => {
        return await findPriceHistoryByCaip19({ timeframe, caip19: asset })
      })
    )

    const result = responses.reduce<HistoryData[][]>((acc, response) => {
      if (response.status === 'rejected') return acc
      const mapped = response.value.map(({ date, price }) => ({
        date: date.valueOf().toString(), // dates aren't serializable in redux actions or state
        price
      }))
      acc.push(mapped)
      return acc
    }, [])

    return result
  }
)

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
  },
  extraReducers: builder => {
    builder.addCase(fetchPriceHistory.pending, state => {
      state.loading = true
    })
    builder.addCase(fetchPriceHistory.rejected, state => {
      state.loading = false
    })
    builder.addCase(fetchPriceHistory.fulfilled, (state, { payload, meta }) => {
      const { assets, timeframe } = meta.arg
      payload.forEach((priceData, idx) => (state.priceHistory[timeframe][assets[idx]] = priceData))
      state.loading = false
    })
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
      queryFn: async () => ({ data: await findAll({ pages: 4, perPage: 250 }) }),
      onCacheEntryAdded: async (_args, { dispatch, cacheDataLoaded, getCacheEntry }) => {
        await cacheDataLoaded
        const data = getCacheEntry().data
        data && dispatch(marketData.actions.setMarketData(data))
      }
    }),
    findByCaip19: build.query<MarketCapResult, CAIP19>({
      queryFn: async (caip19: CAIP19) => {
        try {
          const marketData = await findByCaip19({ caip19 })
          if (!marketData) throw new Error()
          const data = { [caip19]: marketData }
          return { data }
        } catch (e) {
          const error = { data: `findByCaip19: no market data for ${caip19}`, status: 404 }
          return { error }
        }
      },
      onCacheEntryAdded: async (_args, { dispatch, cacheDataLoaded, getCacheEntry }) => {
        await cacheDataLoaded
        const data = getCacheEntry().data
        data && dispatch(marketData.actions.setMarketData(data))
      }
    }),
    // change this return type to be the price history for timeframe and assetId
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
      onCacheEntryAdded: async (args, { dispatch, cacheDataLoaded, getCacheEntry }) => {
        await cacheDataLoaded
        const data = getCacheEntry().data
        if (!data) {
          console.info(`findPriceHistoryByCaip19: no data in onCacheEntryAdded for ${args.assetId}`)
          return
        }
        const payload = { data, args }
        data && dispatch(marketData.actions.setPriceHistory(payload))
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

export const selectMarketAssetPercentChangeById = createSelector(
  selectMarketData,
  selectPriceHistory,
  (_state: ReduxState, args: { assetId: CAIP19; timeframe: HistoryTimeframe }) => args,
  (marketData, priceHistory, { assetId, timeframe }): number => {
    const naivePriceChange = marketData?.[assetId]?.changePercent24Hr
    const assetPriceHistory = priceHistory[timeframe]?.[assetId]
    const start = assetPriceHistory?.[0]?.price
    const end = assetPriceHistory?.[assetPriceHistory.length - 1]?.price
    if (!(start && end)) return naivePriceChange
    const startBn = bnOrZero(start)
    const startAbs = startBn.abs()
    const endBn = bnOrZero(end)
    return endBn.minus(startBn).div(startAbs).times(100).decimalPlaces(2).toNumber()
  }
)

export const selectPriceHistoryByAssetTimeframe = createSelector(
  selectPriceHistory,
  selectAssetId,
  (_state: ReduxState, _assetId: CAIP19, timeframe: HistoryTimeframe) => timeframe,
  (priceHistory, assetId, timeframe) =>
    (priceHistory[timeframe][assetId] ?? []).map(({ price, date }) => ({
      price,
      // TODO(0xdef1cafe): find best primitive to return/store this
      date: new Date(Number(date) * 1000).toISOString()
    }))
)

export const selectPriceHistoryLoadingByAssetTimeframe = createSelector(
  selectPriceHistory,
  selectAssetId,
  (_state: ReduxState, _assetId: CAIP19, timeframe: HistoryTimeframe) => timeframe,
  // if we don't have the data it's loading
  (priceHistory, assetId, timeframe) => !Boolean(priceHistory[timeframe][assetId])
)

export const selectPriceHistoryTimeframe = createSelector(
  selectPriceHistory,
  (_state: ReduxState, timeframe: HistoryTimeframe) => timeframe,
  (priceHistory, timeframe) => priceHistory[timeframe]
)
