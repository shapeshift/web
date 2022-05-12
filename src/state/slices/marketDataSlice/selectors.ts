import { createSelector } from '@reduxjs/toolkit'
import { AssetId } from '@shapeshiftoss/caip'
import { HistoryData, HistoryTimeframe, MarketCapResult } from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import createCachedSelector from 're-reselect'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { priceAtBlockTime } from 'lib/charts'
import { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectSelectedCurrency } from 'state/slices/preferencesSlice/selectors'

const selectAllMarketData = (state: ReduxState) => state.marketData.byId
const selectFiatMarketData = (state: ReduxState) => state.marketData.fiat.byId
export const selectMarketData = createDeepEqualOutputSelector(
  selectAllMarketData,
  selectFiatMarketData,
  selectSelectedCurrency,
  (marketData, fiatMarketData, selectedCurrency) => {
    // fallback to usd
    const fiatPrice = bnOrZero(fiatMarketData[selectedCurrency]?.price ?? 1)
    return Object.entries(marketData).reduce<MarketCapResult>((acc, [caip19, assetMarketData]) => {
      acc[caip19] = {
        ...assetMarketData,
        price: bnOrZero(assetMarketData.price).times(fiatPrice).toString(),
        marketCap: bnOrZero(assetMarketData.marketCap).times(fiatPrice).toString(),
      }
      return acc
    }, {})
  },
)

const selectAssetId = (_state: ReduxState, assetId: AssetId) => assetId

export const selectMarketDataById = createCachedSelector(
  selectMarketData,
  selectAssetId,
  selectFiatMarketData,
  selectSelectedCurrency,
  (marketData, assetId, fiatMarketData, selectedCurrency) => {
    const assetMarketData = marketData[assetId]
    if (selectedCurrency === 'USD') return assetMarketData
    const fiatPrice = bnOrZero(fiatMarketData[selectedCurrency]?.price ?? 1)
    return {
      ...assetMarketData,
      price: bnOrZero(assetMarketData?.price ?? 0)
        .times(fiatPrice)
        .toString(),
    }
  },
)

// assets we have loaded market data for
export const selectMarketDataIds = (state: ReduxState) => state.marketData.ids

// if we don't have it it's loading
export const selectMarketDataLoadingById = createSelector(
  selectMarketDataById,
  (assetMarketData): boolean => isEmpty(assetMarketData),
)

export const selectPriceHistory = (state: ReduxState) => state.marketData.priceHistory
export const selectFiatPriceHistory = (state: ReduxState) => state.marketData.fiat.priceHistory

export const selectPriceHistoryByAssetTimeframe = createDeepEqualOutputSelector(
  selectPriceHistory,
  selectSelectedCurrency,
  selectFiatPriceHistory,
  selectAssetId,
  (_state: ReduxState, _assetId: AssetId, timeframe: HistoryTimeframe) => timeframe,
  (priceHistory, selectedCurrency, fiatPriceHistoryData, assetId, timeframe) => {
    const assetPriceHistoryData = priceHistory[timeframe][assetId] ?? []
    if (selectedCurrency === 'USD') return assetPriceHistoryData
    const fiatPriceHistory = fiatPriceHistoryData[timeframe][selectedCurrency]
    // fiat history not loaded yet
    if (!fiatPriceHistory) return []
    return assetPriceHistoryData.reduce<HistoryData[]>((acc, assetHistoryDate) => {
      const { price, date } = assetHistoryDate
      const fiatToUsdRate = priceAtBlockTime({
        priceHistoryData: fiatPriceHistory,
        date,
      })
      acc.push({
        price: bnOrZero(price).times(fiatToUsdRate).toNumber(),
        date,
      })
      return acc
    }, [])
  },
)

export const selectPriceHistoriesLoadingByAssetTimeframe = createSelector(
  selectPriceHistory,
  selectFiatPriceHistory,
  selectSelectedCurrency,
  (_state: ReduxState, assetIds: AssetId[], _timeframe: HistoryTimeframe) => assetIds,
  (_state: ReduxState, _assetIds: AssetId[], timeframe: HistoryTimeframe) => timeframe,
  // if we don't have the data it's loading
  (priceHistory, fiatPriceHistory, selectedCurrency, assetIds, timeframe) =>
    !(
      assetIds.every(assetId => Boolean(priceHistory[timeframe][assetId])) &&
      Boolean(fiatPriceHistory[timeframe][selectedCurrency])
    ),
)

export const selectPriceHistoryTimeframe = createSelector(
  selectPriceHistory,
  (_state: ReduxState, timeframe: HistoryTimeframe) => timeframe,
  (priceHistory, timeframe) => priceHistory[timeframe],
)

export const selectFiatPriceHistoryTimeframe = createSelector(
  selectFiatPriceHistory,
  selectSelectedCurrency,
  (_state: ReduxState, timeframe: HistoryTimeframe) => timeframe,
  (fiatPriceHistory, selectedCurrency, timeframe) => fiatPriceHistory[timeframe][selectedCurrency],
)

export const selectPriceHistoriesLoadingByFiatTimeframe = createSelector(
  selectFiatPriceHistory,
  selectSelectedCurrency,
  (_state: ReduxState, timeframe: HistoryTimeframe) => timeframe,
  // if we don't have the data it's loading
  (fiatPriceHistory, selectedCurrency, timeframe) =>
    selectedCurrency === 'USD' ? false : !Boolean(fiatPriceHistory[timeframe][selectedCurrency]),
)
