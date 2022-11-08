import type { AssetId } from '@keepkey/caip'
import type {
  FiatMarketDataArgs,
  FiatPriceHistoryArgs,
  SupportedFiatCurrencies,
} from '@keepkey/market-service'
import {
  findByFiatSymbol,
  findPriceHistoryByFiatSymbol,
  MarketServiceManager,
} from '@keepkey/market-service'
import type { HistoryData, MarketCapResult, MarketData } from '@keepkey/types'
import { HistoryTimeframe } from '@keepkey/types'
import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import { getConfig } from 'config'
import { logger } from 'lib/logger'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'

const moduleLogger = logger.child({ namespace: ['marketDataSlice'] })

export type PriceHistoryData = {
  [k: AssetId]: HistoryData[] | undefined
}

type PriceHistoryByTimeframe = {
  [k in HistoryTimeframe]: PriceHistoryData
}

type MarketDataStateVariant<T extends string> = {
  byId: {
    [k in T]?: MarketData
  }
  priceHistory: PriceHistoryByTimeframe
  ids: T[]
}

type FiatMarketDataState = MarketDataStateVariant<SupportedFiatCurrencies>
type CryptoMarketDataState = MarketDataStateVariant<AssetId>

export type MarketDataState = {
  crypto: CryptoMarketDataState
  fiat: FiatMarketDataState
}

export const INITIAL_PRICE_HISTORY: PriceHistoryByTimeframe = Object.freeze({
  [HistoryTimeframe.HOUR]: {},
  [HistoryTimeframe.DAY]: {},
  [HistoryTimeframe.WEEK]: {},
  [HistoryTimeframe.MONTH]: {},
  [HistoryTimeframe.YEAR]: {},
  [HistoryTimeframe.ALL]: {},
})

const initialState: MarketDataState = {
  crypto: {
    byId: {},
    ids: [],
    priceHistory: INITIAL_PRICE_HISTORY,
  },
  fiat: {
    byId: {},
    ids: [],
    priceHistory: INITIAL_PRICE_HISTORY,
  },
}

// do not directly use or export, singleton
let _marketServiceManager: MarketServiceManager | undefined

type GetMarketServiceManager = () => MarketServiceManager

const getMarketServiceManager: GetMarketServiceManager = () => {
  const config = getConfig()
  if (!_marketServiceManager) {
    _marketServiceManager = new MarketServiceManager({
      coinGeckoAPIKey: config.REACT_APP_COINGECKO_API_KEY,
      // TODO(0xdef1cafe): market service manager needs to accept this into each method dynamically at runtime
      yearnChainReference: 1,
      providerUrls: {
        jsonRpcProviderUrl: config.REACT_APP_ETHEREUM_NODE_URL,
        unchainedEthereumHttpUrl: config.REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL,
        unchainedEthereumWsUrl: config.REACT_APP_UNCHAINED_ETHEREUM_WS_URL,
      },
    })
  }
  return _marketServiceManager
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
      { payload }: { payload: { data: HistoryData[]; args: FindPriceHistoryByAssetIdArgs } },
    ) => {
      const { args, data } = payload
      const { assetId, timeframe } = args
      state.crypto.priceHistory[timeframe][assetId] = data
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
      state.fiat.priceHistory[timeframe][symbol] = data
    },
  },
})

type FindPriceHistoryByAssetIdArgs = { assetId: AssetId; timeframe: HistoryTimeframe }

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
    }),
    findPriceHistoryByAssetId: build.query<HistoryData[], FindPriceHistoryByAssetIdArgs>({
      queryFn: async (args, { dispatch }) => {
        const { assetId, timeframe } = args
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

export const { useFindAllQuery, useFindByFiatSymbolQuery, useFindPriceHistoryByFiatSymbolQuery } =
  marketApi
