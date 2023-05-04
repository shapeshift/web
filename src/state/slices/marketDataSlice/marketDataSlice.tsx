import { createSlice, prepareAutoBatched } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type {
  FiatMarketDataArgs,
  FiatPriceHistoryArgs,
  SupportedFiatCurrencies,
} from '@shapeshiftoss/market-service'
import { findByFiatSymbol, findPriceHistoryByFiatSymbol } from '@shapeshiftoss/market-service'
import type { HistoryData, MarketCapResult, MarketData } from '@shapeshiftoss/types'
import merge from 'lodash/merge'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { isOsmosisLpAsset } from 'lib/utils'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import { getMarketServiceManager } from 'state/slices/marketDataSlice/marketServiceManagerSingleton'
import type {
  FindPriceHistoryByAssetIdArgs,
  MarketDataState,
} from 'state/slices/marketDataSlice/types'

import { foxEthLpAssetId } from '../opportunitiesSlice/constants'
import type { MarketDataById } from './types'

const moduleLogger = logger.child({ namespace: ['marketDataSlice'] })

const initialState: MarketDataState = {
  crypto: {
    byId: {},
    ids: [],
    priceHistory: {},
  },
  fiat: {
    byId: {},
    ids: [],
    priceHistory: {},
  },
}

const shouldIgnoreAsset = (assetId: AssetId | string): boolean => {
  // TODO: remove this once single and multi sided delegation abstraction is implemented
  // since foxEthLpAsset market data is monkey-patched, requesting its price history
  // will return an empty array which overrides the patch.
  const ignoreAssetIds: AssetId[] = [foxEthLpAssetId]
  return ignoreAssetIds.includes(assetId) || isOsmosisLpAsset(fromAssetId(assetId).assetReference)
}

export const defaultMarketData: MarketData = {
  price: '0',
  marketCap: '0',
  volume: '0',
  changePercent24Hr: 0,
}

type CryptoPriceHistoryPayload = { data: HistoryData[]; args: FindPriceHistoryByAssetIdArgs }

export const marketData = createSlice({
  name: 'marketData',
  initialState,
  reducers: {
    clear: () => initialState,
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
      },

      // Use the `prepareAutoBatched` utility to automatically
      // add the `action.meta[SHOULD_AUTOBATCH]` field the enhancer needs
      prepare: prepareAutoBatched<MarketDataById<AssetId>>(),
    },
    setCryptoPriceHistory: {
      reducer: (state, { payload }: { payload: CryptoPriceHistoryPayload }) => {
        const { args } = payload
        const { assetId, timeframe } = args
        const incoming = {
          crypto: {
            priceHistory: {
              [timeframe]: {
                [assetId]: payload.data,
              },
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
    findByAssetId: build.query<MarketCapResult, AssetId>({
      queryFn: async (assetId: AssetId, { dispatch }) => {
        try {
          const currentMarketData = await getMarketServiceManager().findByAssetId({ assetId })
          if (!currentMarketData) throw new Error()
          const data = { [assetId]: currentMarketData }
          dispatch(marketData.actions.setCryptoMarketData(data))
          return { data }
        } catch (e) {
          const error = { data: `findByAssetId: no market data for ${assetId}`, status: 404 }
          return { error }
        }
      },
      keepUnusedDataFor: 5, // Invalidate cached asset market data after 5 seconds.
    }),
    findPriceHistoryByAssetId: build.query<HistoryData[] | null, FindPriceHistoryByAssetIdArgs>({
      queryFn: async (args, { dispatch }) => {
        const { assetId, timeframe } = args
        if (shouldIgnoreAsset(assetId)) return { data: [] }
        try {
          const data = await getMarketServiceManager().findPriceHistoryByAssetId({
            timeframe,
            assetId,
          })
          const payload = { args, data }
          dispatch(marketData.actions.setCryptoPriceHistory(payload))
          return { data }
        } catch (e) {
          const error = {
            data: `findPriceHistoryByAssetId: error fetching price history for ${assetId}`,
            status: 400,
          }
          return { error }
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
          const err = `findByFiatSymbol: no market data for ${symbol}`
          moduleLogger.error(e, err)
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
  useFindByAssetIdQuery,
  useFindAllQuery,
  useFindByFiatSymbolQuery,
  useFindPriceHistoryByFiatSymbolQuery,
} = marketApi
