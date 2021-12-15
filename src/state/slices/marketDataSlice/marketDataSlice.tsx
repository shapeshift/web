import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { findAll, findByCaip19, findPriceHistoryByCaip19 } from '@shapeshiftoss/market-service'
import { HistoryData, HistoryTimeframe, MarketCapResult, MarketData } from '@shapeshiftoss/types'
import { isEmpty } from 'lodash'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { ReduxState } from 'state/reducer'

type PriceHistoryByTimeframe = {
  [k in HistoryTimeframe]: {
    [k: CAIP19]: HistoryData[]
  }
}

export type MarketDataState = {
  loading: boolean // remove this, if selector returns null we don't have it
  marketCap?: MarketCapResult // remove this as it's the same as marketData.byId
  marketData: {
    byId: {
      [k: CAIP19]: MarketData
    }
    ids: CAIP19[]
  }
  priceHistory: PriceHistoryByTimeframe
}

export const fetchMarketData = createAsyncThunk(
  'marketData/fetchMarketData',
  async (caip: CAIP19) => {
    return findByCaip19({ caip19: caip })
  }
)

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

const initialPriceHistory = {
  [HistoryTimeframe.HOUR]: {},
  [HistoryTimeframe.DAY]: {},
  [HistoryTimeframe.WEEK]: {},
  [HistoryTimeframe.MONTH]: {},
  [HistoryTimeframe.YEAR]: {},
  [HistoryTimeframe.ALL]: {}
}

const initialState: MarketDataState = {
  marketData: {
    byId: {},
    ids: []
  },
  priceHistory: initialPriceHistory,
  loading: false
}

export const marketData = createSlice({
  name: 'marketData',
  initialState,
  reducers: {
    setMarketData: (state, { payload }) => {
      state.marketData.byId = { ...state.marketData.byId, ...payload } // upsert
      const ids = Array.from(new Set([...state.marketData.ids, ...Object.keys(payload)]))
      state.marketData.ids = ids // upsert unique
    },
    setPriceHistory: (state, { payload }: { payload: Partial<typeof initialPriceHistory> }) => {
      state.priceHistory = { ...state.priceHistory, ...payload } // upsert
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
    builder.addCase(fetchMarketData.pending, state => {
      state.loading = true
    })
    builder.addCase(fetchMarketData.rejected, state => {
      state.loading = false
    })
    builder.addCase(fetchMarketData.fulfilled, (state, { payload, meta }) => {
      const assetCAIP19 = meta.arg
      if (payload) {
        state.marketData.byId[assetCAIP19] = payload
        if (!state.marketData.ids.includes(assetCAIP19)) state.marketData.ids.push(assetCAIP19)
      }
      state.loading = false
    })
  }
})

type FindPriceHistoryByCaip19Args = { assets: CAIP19[]; timeframe: HistoryTimeframe }

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
    // TODO(0xdef1cafe): make this take a single asset and dispatch multiple actions
    findPriceHistoryByCaip19: build.query<PriceHistoryByTimeframe, FindPriceHistoryByCaip19Args>({
      queryFn: async ({ assets, timeframe }, { getState }) => {
        const data: PriceHistoryByTimeframe = (getState() as ReduxState).marketData.priceHistory
        const reqs = assets.map(async a => findPriceHistoryByCaip19({ timeframe, caip19: a }))
        const responses = await Promise.allSettled(reqs)

        responses.forEach((res, idx) => {
          if (res.status === 'rejected') {
            console.warn(`findPriceHistoryByCaip19: failed to get price history for ${assets[idx]}`)
            return
          }
          data[timeframe][assets[idx]] = res.value
        })

        return { data }
      },
      onCacheEntryAdded: async (_args, { dispatch, cacheDataLoaded, getCacheEntry }) => {
        await cacheDataLoaded
        const data = getCacheEntry().data
        data && dispatch(marketData.actions.setPriceHistory(data))
      }
    })
  })
})

export const { useFindAllQuery, useFindByCaip19Query, useFindPriceHistoryByCaip19Query } = marketApi

export const selectMarketData = (state: ReduxState) => state.marketData.marketData.byId

const selectAssetId = (_state: ReduxState, assetId: CAIP19) => assetId

export const selectMarketDataById = createSelector(
  selectMarketData,
  selectAssetId,
  (marketData, assetId) => marketData[assetId]
)

// assets we have loaded market data for
export const selectAvailableMarketDataIds = (state: ReduxState) => state.marketData.marketData.ids

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
    return endBn.minus(startBn).div(startAbs).times(100).toNumber()
  }
)
