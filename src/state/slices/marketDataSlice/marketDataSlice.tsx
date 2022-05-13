import { createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react'
import { AssetId } from '@shapeshiftoss/caip'
import {
  FiatMarketDataArgs,
  FiatPriceHistoryArgs,
  findAll,
  findByAssetId,
  findByFiatSymbol,
  findPriceHistoryByAssetId,
  findPriceHistoryByFiatSymbol,
  SupportedFiatCurrencies,
} from '@shapeshiftoss/market-service'
import { HistoryData, HistoryTimeframe, MarketCapResult, MarketData } from '@shapeshiftoss/types'

export type PriceHistoryData = {
  [k: AssetId]: HistoryData[]
}

type PriceHistoryByTimeframe = {
  [k in HistoryTimeframe]: PriceHistoryData
}

type CommonMarketDataState = {
  byId: {
    [k: string]: MarketData
  }
  priceHistory: PriceHistoryByTimeframe
}

type FiatMarketDataState = CommonMarketDataState & {
  ids: SupportedFiatCurrencies[]
}

type CryptoMarketDataState = CommonMarketDataState & {
  ids: AssetId[]
}

export type MarketDataState = {
  crypto: CryptoMarketDataState
  fiat: FiatMarketDataState
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
  crypto: {
    byId: {},
    ids: [],
    priceHistory: initialPriceHistory,
  },
  fiat: {
    byId: {},
    ids: [],
    priceHistory: initialPriceHistory,
  },
}

export const marketData = createSlice({
  name: 'marketData',
  initialState,
  reducers: {
    clear: () => initialState,
    setCryptoMarketData: (state, { payload }) => {
      state.crypto.byId = { ...state.crypto.byId, ...payload } // upsert
      const ids = Array.from(new Set([...state.crypto.ids, ...Object.keys(payload)]))
      state.crypto.ids = ids // upsert unique
    },
    setCryptoPriceHistory: (
      state,
      {
        payload: { data, args },
      }: { payload: { data: HistoryData[]; args: FindPriceHistoryByAssetIdArgs } },
    ) => {
      const { assetId, timeframe } = args
      state.crypto.priceHistory[timeframe][assetId] = data
    },
    setFiatMarketData: (state, { payload }) => {
      state.fiat.byId = { ...state.fiat.byId, ...payload } // upsert
      const ids = Array.from(new Set([...state.fiat.ids, ...Object.keys(payload)])).map(
        id => id as SupportedFiatCurrencies,
      )
      state.fiat.ids = ids
    },
    setFiatPriceHistory: (
      state,
      { payload: { data, args } }: { payload: { data: HistoryData[]; args: FiatPriceHistoryArgs } },
    ) => {
      const { symbol, timeframe } = args
      state.fiat.priceHistory[timeframe][symbol] = data
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
        data && dispatch(marketData.actions.setCryptoMarketData(data))
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
          baseQuery.dispatch(marketData.actions.setCryptoMarketData(data))
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
          dispatch(marketData.actions.setCryptoPriceHistory(payload))
        }
      },
    }),
    findByFiatSymbol: build.query<MarketCapResult, FiatMarketDataArgs>({
      queryFn: async ({ symbol }: { symbol: SupportedFiatCurrencies }, baseQuery) => {
        try {
          const currentMarketData = await findByFiatSymbol({ symbol })
          if (!currentMarketData) throw new Error()
          const data = { [symbol]: currentMarketData }
          baseQuery.dispatch(marketData.actions.setFiatMarketData(data))
          return { data }
        } catch (e) {
          console.error(e)
          const error = { data: `findByFiatSymbol: no market data for ${symbol}`, status: 404 }
          return { error }
        }
      },
    }),
    findPriceHistoryByFiatSymbol: build.query<HistoryData[], FiatPriceHistoryArgs>({
      queryFn: async ({ symbol, timeframe }) => {
        try {
          const data = await findPriceHistoryByFiatSymbol({ timeframe, symbol })
          return { data }
        } catch (e) {
          const error = {
            data: `findPriceHistoryByFiatSymbol: error fetching price history for ${symbol}`,
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
          dispatch(marketData.actions.setFiatPriceHistory(payload))
        }
      },
    }),
  }),
})

export const { useFindAllQuery, useFindByAssetIdQuery, useFindPriceHistoryByAssetIdQuery } =
  marketApi
