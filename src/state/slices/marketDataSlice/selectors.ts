import { createSelector } from '@reduxjs/toolkit'
import type { AssetId } from '@shapeshiftoss/caip'
import type {
  HistoryData,
  HistoryTimeframe,
  MarketCapResult,
  MarketData,
} from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import createCachedSelector from 're-reselect'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { priceAtDate } from 'lib/charts'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import type { PriceHistoryData } from 'state/slices/marketDataSlice/types'
import { selectSelectedCurrency } from 'state/slices/preferencesSlice/selectors'

import { defaultMarketData } from './marketDataSlice'
import type { MarketDataById } from './types'

const selectCryptoMarketData = (state: ReduxState) => state.marketData.crypto.byId
const selectFiatMarketData = (state: ReduxState) => state.marketData.fiat.byId

export const selectMarketData = createDeepEqualOutputSelector(
  selectCryptoMarketData,
  selectFiatMarketData,
  selectSelectedCurrency,
  (cryptoMarketData, fiatMarketData, selectedCurrency): MarketDataById<AssetId> => {
    const fiatPrice = bnOrZero(fiatMarketData[selectedCurrency]?.price ?? 1) // fallback to USD
    if (fiatPrice.eq(1)) return cryptoMarketData // don't unnecessarily compute price history for USD
    return Object.entries(cryptoMarketData).reduce<MarketCapResult>(
      (acc, [caip19, assetMarketData]) => {
        if (!assetMarketData) return acc
        acc[caip19] = {
          ...assetMarketData,
          price: bnOrZero(assetMarketData.price).times(fiatPrice).toString(),
          marketCap: bnOrZero(assetMarketData.marketCap).times(fiatPrice).toString(),
        }
        return acc
      },
      {},
    )
  },
)

export const selectFiatToUsdRate = createSelector(
  selectFiatMarketData,
  selectSelectedCurrency,
  (fiatMarketData, selectedCurrency) => bnOrZero(fiatMarketData[selectedCurrency]?.price ?? 1), // fallback to USD
)

const selectAssetId = (_state: ReduxState, assetId: AssetId) => assetId

export const selectMarketDataById = createCachedSelector(
  selectMarketData,
  selectAssetId,
  (cryptoMarketData, assetId): MarketData => {
    return cryptoMarketData[assetId] ?? defaultMarketData
  },
)((_state: ReduxState, assetId?: AssetId): AssetId => assetId ?? 'assetId')

// assets we have loaded market data for
export const selectCryptoMarketDataIdsSortedByMarketCap = (state: ReduxState) =>
  state.marketData.crypto.ids

// if we don't have it, it's loading
export const selectMarketDataLoadingById = createSelector(
  selectMarketDataById,
  (assetMarketData): boolean => isEmpty(assetMarketData),
)

export const selectCryptoPriceHistory = (state: ReduxState) => state.marketData.crypto.priceHistory
export const selectFiatPriceHistory = (state: ReduxState) => state.marketData.fiat.priceHistory

export const selectPriceHistoryByAssetTimeframe = createCachedSelector(
  selectCryptoPriceHistory,
  selectSelectedCurrency,
  selectFiatPriceHistory,
  selectAssetId,
  (_state: ReduxState, _assetId: AssetId, timeframe: HistoryTimeframe) => timeframe,
  (priceHistory, selectedCurrency, fiatPriceHistoryData, assetId, timeframe): HistoryData[] => {
    const assetPriceHistoryData = priceHistory?.[timeframe]?.[assetId] ?? []
    const priceHistoryData = fiatPriceHistoryData?.[timeframe]?.[selectedCurrency]
    if (!priceHistoryData) return assetPriceHistoryData // dont unnecessarily reduce if we don't have it
    return assetPriceHistoryData.reduce<HistoryData[]>((acc, assetHistoryDate) => {
      const { price, date } = assetHistoryDate
      const fiatToUsdRate = priceAtDate({ priceHistoryData, date })
      acc.push({ price: bnOrZero(price).times(fiatToUsdRate).toNumber(), date })
      return acc
    }, [])
  },
)((_state: ReduxState, assetId: AssetId, timeframe: HistoryTimeframe) => `${assetId}-${timeframe}`)

export const selectPriceHistoriesLoadingByAssetTimeframe = createSelector(
  selectCryptoPriceHistory,
  (_state: ReduxState, assetIds: AssetId[], _timeframe: HistoryTimeframe) => assetIds,
  (_state: ReduxState, _assetIds: AssetId[], timeframe: HistoryTimeframe) => timeframe,
  // if we don't have the data it's loading
  (priceHistory, assetIds, timeframe): boolean =>
    !assetIds.every(assetId => Boolean(priceHistory?.[timeframe]?.[assetId])),
)

const selectTimeframeParam = (_state: ReduxState, timeframe: HistoryTimeframe) => timeframe

export const selectCryptoPriceHistoryTimeframe = createSelector(
  selectCryptoPriceHistory,
  selectTimeframeParam,
  (priceHistory, timeframe): PriceHistoryData => priceHistory?.[timeframe] ?? {},
)

export const selectFiatPriceHistoryTimeframe = createSelector(
  selectFiatPriceHistory,
  selectSelectedCurrency,
  selectTimeframeParam,
  (fiatPriceHistory, selectedCurrency, timeframe): HistoryData[] =>
    fiatPriceHistory?.[timeframe]?.[selectedCurrency] ?? [],
)
