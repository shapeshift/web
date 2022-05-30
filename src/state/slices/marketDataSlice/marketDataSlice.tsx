import { createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react'
import { AssetId } from '@shapeshiftoss/caip'
import { foxyAddresses, FoxyApi } from '@shapeshiftoss/investor-foxy'
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
import {
  ChainTypes,
  HistoryData,
  HistoryTimeframe,
  MarketCapResult,
  MarketData,
} from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { getChainAdapters } from 'context/PluginProvider/PluginProvider'
import { logger } from 'lib/logger'

const moduleLogger = logger.child({ namespace: ['marketDataSlice'] })

// TODO use constant from constants file when get FOX wire up is merged
const FoxyAssetId = 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3'
const FoxyAssetPrecision = '18'

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
  reducerPath: 'marketApi',
  // not actually used, only used to satisfy createApi, we use a custom queryFn
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  // refetch if network connection is dropped, useful for mobile
  refetchOnReconnect: true,
  endpoints: build => ({
    findAll: build.query<MarketCapResult, void>({
      // top 1000 assets
      queryFn: async (_, { dispatch }) => {
        try {
          const data = await findAll({ count: 1000 })
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
          const currentMarketData = await findByAssetId({ assetId })
          if (!currentMarketData) throw new Error()

          //FOXy specific api call to retrieve max supply
          if (assetId === FoxyAssetId) {
            const chainAdapters = getChainAdapters()
            const api = new FoxyApi({
              adapter: chainAdapters.byChain(ChainTypes.Ethereum),
              providerUrl: getConfig().REACT_APP_ETHEREUM_NODE_URL,
              foxyAddresses,
            })
            const tokenContractAddress = foxyAddresses[0].foxy
            const foxyTotalSupply = await api.totalSupply({ tokenContractAddress })
            currentMarketData.maxSupply = foxyTotalSupply
              ?.div(`1e+${FoxyAssetPrecision}`)
              .toString()
          }

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
          const data = await findPriceHistoryByAssetId({ timeframe, assetId })
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
          const data = `findByFiatSymbol: no market data for ${symbol}`
          moduleLogger.error(e, data)
          const error = { data, status: 404 }
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

export const { useFindAllQuery } = marketApi
