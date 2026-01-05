import { createSlice, prepareAutoBatched } from '@reduxjs/toolkit'
import type { AssetId } from '@shapeshiftoss/caip'
import type { HistoryData, MarketData } from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import merge from 'lodash/merge'

import type { MarketDataById } from './types'
import { trimOutOfBoundsMarketData } from './utils'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { FiatPriceHistoryArgs, SupportedFiatCurrencies } from '@/lib/market-service'
import type { MarketDataState } from '@/state/slices/marketDataSlice/types'

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
