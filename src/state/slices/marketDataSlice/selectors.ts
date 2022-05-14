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

const selectAllCryptoMarketData = (state: ReduxState) => state.marketData.crypto.byId
const selectFiatMarketData = (state: ReduxState) => state.marketData.fiat.byId

export const selectMarketData = createDeepEqualOutputSelector(
  selectAllCryptoMarketData,
  selectFiatMarketData,
  selectSelectedCurrency,
  (cryptoMarketData, fiatMarketData, selectedCurrency) => {
    // fallback to usd
    const fiatPrice = bnOrZero(fiatMarketData[selectedCurrency]?.price ?? 1)
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
)((_state: ReduxState, assetId: AssetId | undefined): AssetId => assetId ?? 'undefined')

// assets we have loaded market data for
export const selectCryptoMarketDataIds = (state: ReduxState) => state.marketData.crypto.ids

// if we don't have it it's loading
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
    const assetPriceHistoryData = priceHistory[timeframe][assetId] ?? []
    if (selectedCurrency === 'USD') return assetPriceHistoryData
    const priceHistoryData = fiatPriceHistoryData[timeframe][selectedCurrency]
    // fiat history not loaded yet
    if (!priceHistoryData) return []
    return assetPriceHistoryData.reduce<HistoryData[]>((acc, assetHistoryDate) => {
      const { price, date } = assetHistoryDate
      const fiatToUsdRate = priceAtBlockTime({ priceHistoryData, date })
      acc.push({ price: bnOrZero(price).times(fiatToUsdRate).toNumber(), date })
      return acc
    }, [])
  },
)(
  (_priceHistory, selectedCurrency, _fiatPriceHistoryData, assetId, timeframe) =>
    `${assetId}-${timeframe}-${selectedCurrency}`,
)

export const selectPriceHistoriesLoadingByAssetTimeframe = createSelector(
  selectCryptoPriceHistory,
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

const selectTimeframeParam = (_state: ReduxState, timeframe: HistoryTimeframe) => timeframe

export const selectCryptoPriceHistoryTimeframe = createSelector(
  selectCryptoPriceHistory,
  selectTimeframeParam,
  (priceHistory, timeframe) => priceHistory[timeframe],
)

export const selectFiatPriceHistoryTimeframe = createSelector(
  selectFiatPriceHistory,
  selectSelectedCurrency,
  selectTimeframeParam,
  (fiatPriceHistory, selectedCurrency, timeframe) => fiatPriceHistory[timeframe][selectedCurrency],
)

export const selectFiatPriceHistoriesLoadingByTimeframe = createCachedSelector(
  selectFiatPriceHistory,
  selectSelectedCurrency,
  selectTimeframeParam,
  // if we don't have the data it's loading
  (fiatPriceHistory, currency, timeframe) => !Boolean(fiatPriceHistory[timeframe][currency]),
)((_fiatPriceHistory, currency, timeframe) => `${currency}-${timeframe}`)
