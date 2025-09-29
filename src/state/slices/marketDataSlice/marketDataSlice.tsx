import { createSlice, prepareAutoBatched } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { HistoryData, MarketCapResult, MarketData } from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { AsyncQueuer } from '@tanstack/pacer'
import merge from 'lodash/merge'

import type { MarketDataById } from './types'
import { trimOutOfBoundsMarketData } from './utils'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import type {
  FiatMarketDataArgs,
  FiatPriceHistoryArgs,
  SupportedFiatCurrencies,
} from '@/lib/market-service'
import { findByFiatSymbol, findPriceHistoryByFiatSymbol } from '@/lib/market-service'
import { BASE_RTK_CREATE_API_CONFIG } from '@/state/apis/const'
import { getMarketServiceManager } from '@/state/slices/marketDataSlice/marketServiceManagerSingleton'
import type {
  FindPriceHistoryByAssetIdArgs,
  MarketDataState,
} from '@/state/slices/marketDataSlice/types'
import type { AppDispatch } from '@/state/store'

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
}

type CryptoPriceHistoryPayload = {
  timeframe: HistoryTimeframe
  historyDataByAssetId: Record<AssetId, HistoryData[]>
}

export const marketData = createSlice({
  name: 'marketData',
  initialState,
  selectors: {
    selectMarketDataIdsSortedByMarketCapUsd: state => state.crypto.ids,
    selectFiatMarketData: state => state.fiat.byId,
    selectMarketDataUsd: state => state.crypto.byId,
    selectCryptoPriceHistory: state => state.crypto.priceHistory,
    selectFiatPriceHistory: state => state.fiat.priceHistory,
  },
  reducers: {
    clear: () => initialState,
    setCryptoMarketData: {
      reducer: function setCryptoMarketData(
        state,
        { payload }: { payload: MarketDataById<AssetId> },
      ) {
        state.crypto.byId = Object.assign(state.crypto.byId, payload) // upsert
        state.crypto.ids = Object.keys(state.crypto.byId).sort((assetIdA, assetIdB) => {
          const marketDataA = state.crypto.byId[assetIdA]
          const marketDataB = state.crypto.byId[assetIdB]
          if (!marketDataA || !marketDataB) return 0
          const marketCapA = bnOrZero(marketDataA.marketCap)
          const marketCapB = bnOrZero(marketDataB.marketCap)

          return marketCapB.comparedTo(marketCapA) ?? 0
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

        // Trim market data out of the bounds of the current timeframe
        trimOutOfBoundsMarketData(
          state.fiat.priceHistory,
          timeframe,
          Object.keys(historyDataByAssetId),
        )

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

      // Trim market data out of the bounds of the current timeframe
      trimOutOfBoundsMarketData(state.fiat.priceHistory, timeframe, [symbol])

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

// Async queuer to control findByAssetId() fetching parallelism
const findbyAssetIdQueue = new AsyncQueuer(
  async ({ assetId, dispatch }: { assetId: AssetId; dispatch: AppDispatch; priority: number }) => {
    const currentMarketData = await getMarketServiceManager().findByAssetId({ assetId })
    if (currentMarketData) {
      const payload = { [assetId]: currentMarketData }
      dispatch(marketData.actions.setCryptoMarketData(payload))
    }
  },
  {
    concurrency: 25, // Process max. 25 AssetIds at once
    wait: 5_000, // Wait at least 5 seconds between starting a new chunk
    started: true, // Start processing immediately
    getPriority: item => item.priority, // Higher numbers have higher priority
  },
)

// Async queuer to control findPriceHistoryByAssetId() fetching parallelism
const findPriceHistoryByAssetIdQueue = new AsyncQueuer(
  async ({
    args,
    dispatch,
  }: {
    args: FindPriceHistoryByAssetIdArgs
    dispatch: AppDispatch
    priority: number
  }) => {
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
  },
  {
    concurrency: 25, // Process max. 25 AssetIds at once
    wait: 5_000, // Wait at least 5 seconds between starting a new chunk
    started: true, // Start processing immediately
    getPriority: item => item.priority, // Higher numbers have higher priority
  },
)

export const marketApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'marketApi',
  endpoints: build => ({
    findAll: build.query<MarketCapResult, void>({
      // top 2000 assets
      // named function for profiling+debugging purposes
      queryFn: async function findAll(_, { dispatch }) {
        try {
          const data = await getMarketServiceManager().findAll({ count: 2000 })
          dispatch(marketData.actions.setCryptoMarketData(data))
          return { data }
        } catch (e) {
          const error = { data: `findAll: could not find marketData for all assets`, status: 404 }
          return { error }
        }
      },
    }),
    // TODO(gomes): While adding queuer to this, noting we don't even care about this guy anymore and never did -
    // all it does is fetch and dispatch into `marketData`, this doesn't need to be an RTK query
    // Keeping this here for the time being to not make potential breaking changes, but this could well be a react-query to avoid layers of complexity
    findByAssetId: build.query<null, AssetId>({
      // named function for profiling+debugging purposes
      queryFn: function findByAssetId(assetId: AssetId, { dispatch }) {
        findbyAssetIdQueue.addItem({ assetId, dispatch, priority: 1 })

        return { data: null }
      },
      keepUnusedDataFor: 30, // Invalidate cached asset market data after 30 seconds.
    }),
    findPriceHistoryByAssetId: build.query<null, FindPriceHistoryByAssetIdArgs>({
      // named function for profiling+debugging purposes
      queryFn: function findPriceHistoryByAssetId(args, { dispatch }) {
        findPriceHistoryByAssetIdQueue.addItem({
          args,
          dispatch,
          priority: 0,
        })

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
  useFindAllQuery: useFindAllMarketDataQuery,
  useFindPriceHistoryByAssetIdQuery,
  useFindByAssetIdQuery: useFindMarketDataByAssetIdQuery,
} = marketApi
