import { createSlice, prepareAutoBatched } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { HistoryData, MarketCapResult, MarketData } from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import merge from 'lodash/merge'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type {
  FiatMarketDataArgs,
  FiatPriceHistoryArgs,
  SupportedFiatCurrencies,
} from 'lib/market-service'
import { findByFiatSymbol, findPriceHistoryByFiatSymbol } from 'lib/market-service'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import { getMarketServiceManager } from 'state/slices/marketDataSlice/marketServiceManagerSingleton'
import type {
  FindPriceHistoryByAssetIdArgs,
  MarketDataState,
} from 'state/slices/marketDataSlice/types'

import type { MarketDataById } from './types'

export const initialState: MarketDataState = {
  crypto: {
    byId: {},
    ids: [],
    priceHistory: {},
  },
  fiat: {
    byId: {},
    ids: [],
    priceHistory: {
      // 1usd has always cost exactly 1usd
      [HistoryTimeframe.ALL]: {
        USD: [
          {
            price: 1,
            date: 0,
          },
        ],
      },
    },
  },
  isMarketDataLoaded: false,
}

export const defaultMarketData: MarketData = {
  price: '0',
  marketCap: '0',
  volume: '0',
  changePercent24Hr: 0,
}

type CryptoPriceHistoryPayload = {
  timeframe: HistoryTimeframe
  historyDataByAssetId: Record<AssetId, HistoryData[]>
}

export const marketData = createSlice({
  name: 'marketData',
  initialState,
  reducers: {
    clear: () => initialState,
    setMarketDataLoaded: state => {
      state.isMarketDataLoaded = true
    },
    setCryptoMarketData: {
      reducer: (state, { payload }: { payload: MarketDataById<AssetId> }) => {
        state.crypto.byId = Object.assign(state.crypto.byId, payload) // upsert
        state.crypto.ids = Object.keys(state.crypto.byId).sort((assetIdA, assetIdB) => {
          const marketDataA = state.crypto.byId[assetIdA]
          const marketDataB = state.crypto.byId[assetIdB]
          if (!marketDataA || !marketDataB) return 0
          const marketCapA = bnOrZero(marketDataA.marketCap)
          const marketCapB = bnOrZero(marketDataB.marketCap)

          return marketCapB.comparedTo(marketCapA)
        })

        // Rebuilds state.crypto.byId with the ordered index we just built above
        state.crypto.byId = state.crypto.ids.reduce<Partial<Record<AssetId, MarketData>>>(
          (acc, assetId) => {
            acc[assetId] = state.crypto.byId[assetId]
            return acc
          },
          {},
        )
      },

      // Use the `prepareAutoBatched` utility to automatically
      // add the `action.meta[SHOULD_AUTOBATCH]` field the enhancer needs
      prepare: prepareAutoBatched<MarketDataById<AssetId>>(),
    },
    setCryptoPriceHistory: {
      reducer: (state, { payload }: { payload: CryptoPriceHistoryPayload }) => {
        const { timeframe, historyDataByAssetId } = payload
        const incoming = {
          crypto: {
            priceHistory: {
              [timeframe]: historyDataByAssetId,
            },
          },
        }
        merge(state, incoming)
      },
      // Use the `prepareAutoBatched` utility to automatically
      // add the `action.meta[SHOULD_AUTOBATCH]` field the enhancer needs
      prepare: prepareAutoBatched<CryptoPriceHistoryPayload>(),
    },
    setFiatMarketData: (
      state,
      { payload }: { payload: Partial<{ [k in SupportedFiatCurrencies]: MarketData }> },
    ) => {
      state.fiat.byId = { ...state.fiat.byId, ...payload } // upsert
      const ids = Array.from(new Set([...state.fiat.ids, ...Object.keys(payload)])).map(
        id => id as SupportedFiatCurrencies,
      )
      state.fiat.ids = ids
    },
    setFiatPriceHistory: (
      state,
      { payload }: { payload: { data: HistoryData[]; args: FiatPriceHistoryArgs } },
    ) => {
      const { args, data } = payload
      const { symbol, timeframe } = args
      const incoming = {
        fiat: {
          priceHistory: {
            [timeframe]: {
              [symbol]: data,
            },
          },
        },
      }
      merge(state, incoming)
    },
  },
})

export const marketApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'marketApi',
  endpoints: build => ({
    findAll: build.query<MarketCapResult, void>({
      // top 1000 assets
      queryFn: async (_, { dispatch }) => {
        try {
          const data = await getMarketServiceManager().findAll({ count: 1000 })
          dispatch(marketData.actions.setCryptoMarketData(data))
          return { data }
        } catch (e) {
          const error = { data: `findAll: could not find marketData for all assets`, status: 404 }
          return { error }
        }
      },
    }),
    findByAssetIds: build.query<null, AssetId[]>({
      // named function for profiling+debugging purposes
      queryFn: async function findByAssetIds(assetIds: AssetId[], { dispatch }) {
        if (assetIds.length === 0) return { data: null }

        const responseData = await Promise.all(
          assetIds.map(async assetId => {
            try {
              const currentMarketData = await getMarketServiceManager().findByAssetId({ assetId })
              return { assetId, currentMarketData }
            } catch (e) {
              console.error(e)
              return { assetId, currentMarketData: null }
            }
          }),
        )

        const payload = responseData.reduce<MarketCapResult>(
          (acc, { assetId, currentMarketData }) => {
            if (currentMarketData) acc[assetId] = currentMarketData
            return acc
          },
          {},
        )

        dispatch(marketData.actions.setCryptoMarketData(payload))

        return { data: null }
      },
      keepUnusedDataFor: 5, // Invalidate cached asset market data after 5 seconds.
    }),
    findPriceHistoryByAssetId: build.query<null, FindPriceHistoryByAssetIdArgs>({
      // named function for profiling+debugging purposes
      queryFn: async function findPriceHistoryByAssetIdd(args, { dispatch }) {
        const { assetId, timeframe } = args

        const historyDataByAssetId = await getMarketServiceManager()
          .findPriceHistoryByAssetId({
            timeframe,
            assetId,
          })
          .then(data => ({ [assetId]: data }))
          .catch(e => {
            console.error(e)
            return { [assetId]: [] }
          })

        dispatch(marketData.actions.setCryptoPriceHistory({ timeframe, historyDataByAssetId }))

        return { data: null }
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
          const err = `findByFiatSymbol: no market data for ${symbol}`
          // set dummy data on error
          const data = { [symbol]: [] }
          baseQuery.dispatch(marketData.actions.setFiatMarketData(data))
          const error = { data: err, status: 404 }
          return { error }
        }
      },
    }),
    findPriceHistoryByFiatSymbol: build.query<HistoryData[], FiatPriceHistoryArgs>({
      queryFn: async (args, { dispatch }) => {
        const { symbol, timeframe } = args
        try {
          const data = await findPriceHistoryByFiatSymbol({ timeframe, symbol })
          const payload = { args, data }
          dispatch(marketData.actions.setFiatPriceHistory(payload))
          return { data }
        } catch (e) {
          // set dummy data on error
          const data: HistoryData[] = []
          const payload = { args, data }
          dispatch(marketData.actions.setFiatPriceHistory(payload))
          const error = {
            data: `findPriceHistoryByFiatSymbol: error fetching price history for ${symbol}`,
            status: 400,
          }
          return { error }
        }
      },
    }),
  }),
})

export const {
  useFindByAssetIdsQuery,
  useFindAllQuery,
  useFindByFiatSymbolQuery,
  useFindPriceHistoryByFiatSymbolQuery,
  useFindPriceHistoryByAssetIdQuery,
} = marketApi
