import { createSelector } from '@reduxjs/toolkit'
import type { AssetId } from '@shapeshiftoss/caip'
import type { HistoryData, HistoryTimeframe, MarketData } from '@shapeshiftoss/types'
import createCachedSelector from 're-reselect'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { priceAtDate } from 'lib/charts'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAssetIdParamFromFilter } from 'state/selectors'
import type { PriceHistoryData } from 'state/slices/marketDataSlice/types'
import { selectSelectedCurrency } from 'state/slices/preferencesSlice/selectors'

import { defaultMarketData } from './marketDataSlice'
import type { MarketDataById } from './types'

// TODO(woodenfurniture): rename this to clarify that prices are in USD not fiat
export const selectCryptoMarketData = ((state: ReduxState) => state.marketData.crypto.byId) as (
  state: ReduxState,
) => MarketDataById<AssetId>
export const selectCryptoMarketDataIds = (state: ReduxState) => state.marketData.crypto.ids
const selectFiatMarketData = (state: ReduxState) => state.marketData.fiat.byId

// TODO(woodenfurniture): rename this to clarify that prices are in fiat not USD
export const selectSelectedCurrencyMarketDataSortedByMarketCap = createDeepEqualOutputSelector(
  selectCryptoMarketData,
  selectCryptoMarketDataIds,
  selectFiatMarketData,
  selectSelectedCurrency,
  (
    cryptoMarketData,
    marketDataAssetIds,
    fiatMarketData,
    selectedCurrency,
  ): MarketDataById<AssetId> => {
    const fiatPrice = bnOrZero(fiatMarketData[selectedCurrency]?.price ?? 1) // fallback to USD
    // No currency conversion needed
    return selectedCurrency === 'USD'
      ? cryptoMarketData
      : marketDataAssetIds.reduce<MarketDataById<AssetId>>((acc, assetId) => {
          const assetMarketData = cryptoMarketData[assetId]
          // Market data massaged to the selected currency
          const selectedCurrencyAssetMarketData = Object.assign({}, assetMarketData ?? {}, {
            price: bnOrZero(assetMarketData?.price).times(fiatPrice).toString(),
            marketCap: bnOrZero(assetMarketData?.marketCap).times(fiatPrice).toString(),
            volume: bnOrZero(assetMarketData?.volume).times(fiatPrice).toString(),
            changePercent24Hr: assetMarketData?.changePercent24Hr ?? 0,
          })

          acc[assetId] = selectedCurrencyAssetMarketData

          return acc
        }, {})
  },
)

export const selectUserCurrencyToUsdRate = createSelector(
  selectFiatMarketData,
  selectSelectedCurrency,
  (fiatMarketData, selectedCurrency) =>
    bnOrZero(fiatMarketData[selectedCurrency]?.price ?? 1).toString(), // fallback to USD
)

const selectAssetId = (_state: ReduxState, assetId: AssetId) => assetId

export const selectMarketDataById = createCachedSelector(
  selectSelectedCurrencyMarketDataSortedByMarketCap,
  selectAssetId,
  (cryptoMarketData, assetId): MarketData => {
    return cryptoMarketData[assetId] ?? defaultMarketData
  },
)((_state: ReduxState, assetId?: AssetId): AssetId => assetId ?? 'assetId')

export const selectMarketDataByFilter = createCachedSelector(
  selectSelectedCurrencyMarketDataSortedByMarketCap,
  selectAssetIdParamFromFilter,
  (cryptoMarketData, assetId): MarketData => {
    return cryptoMarketData[assetId ?? ''] ?? defaultMarketData
  },
)((_s: ReduxState, filter) => filter?.assetId ?? 'assetId')

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

export const selectUsdRateByAssetId = createCachedSelector(
  selectCryptoMarketData,
  selectAssetId,
  (cryptoMarketData, assetId): string | undefined => {
    return cryptoMarketData[assetId]?.price
  },
)((_state: ReduxState, assetId?: AssetId): AssetId => assetId ?? 'assetId')

export const selectUserCurrencyRateByAssetId = createCachedSelector(
  selectCryptoMarketData,
  selectUserCurrencyToUsdRate,
  selectAssetId,
  (cryptoMarketData, userCurrencyToUsdRate, assetId): string => {
    return bnOrZero(cryptoMarketData[assetId]?.price).times(userCurrencyToUsdRate).toString()
  },
)((_state: ReduxState, assetId?: AssetId): AssetId => assetId ?? 'assetId')
