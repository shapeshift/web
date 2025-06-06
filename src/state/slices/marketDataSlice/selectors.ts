import { createSelector } from '@reduxjs/toolkit'
import { QueryStatus } from '@reduxjs/toolkit/query'
import type { AssetId } from '@shapeshiftoss/caip'
import type { HistoryData, HistoryTimeframe, MarketData } from '@shapeshiftoss/types'
import createCachedSelector from 're-reselect'

import { marketData } from './marketDataSlice'
import type { MarketDataById } from './types'
import { getTrimmedOutOfBoundsMarketData } from './utils'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { priceAtDate } from '@/lib/charts'
import type { ReduxState } from '@/state/reducer'
import { createDeepEqualOutputSelector } from '@/state/selector-utils'
import { selectAssetIdParamFromFilter } from '@/state/selectors'
import type { PriceHistoryData } from '@/state/slices/marketDataSlice/types'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'

export const selectMarketDataUserCurrency = createDeepEqualOutputSelector(
  marketData.selectors.selectMarketDataUsd,
  marketData.selectors.selectMarketDataIdsSortedByMarketCapUsd,
  marketData.selectors.selectFiatMarketData,
  preferences.selectors.selectSelectedCurrency,
  (
    marketDataUsd,
    marketDataAssetIdsSortedByMarketCapUsd,
    fiatMarketData,
    selectedCurrency,
  ): MarketDataById<AssetId> => {
    const fiatPrice = bnOrZero(fiatMarketData[selectedCurrency]?.price ?? 1) // fallback to USD
    // No currency conversion needed
    return selectedCurrency === 'USD'
      ? marketDataUsd
      : marketDataAssetIdsSortedByMarketCapUsd.reduce<MarketDataById<AssetId>>((acc, assetId) => {
          const assetMarketData = marketDataUsd[assetId]
          // Market data massaged to the selected currency
          const selectedCurrencyAssetMarketData = Object.assign({}, assetMarketData ?? {}, {
            price: bnOrZero(assetMarketData?.price)
              .times(fiatPrice)
              .toString(),
            marketCap: bnOrZero(assetMarketData?.marketCap)
              .times(fiatPrice)
              .toString(),
            volume: bnOrZero(assetMarketData?.volume)
              .times(fiatPrice)
              .toString(),
            changePercent24Hr: assetMarketData?.changePercent24Hr ?? 0,
          })

          acc[assetId] = selectedCurrencyAssetMarketData

          return acc
        }, {})
  },
)

export const selectUserCurrencyToUsdRate = createSelector(
  marketData.selectors.selectFiatMarketData,
  preferences.selectors.selectSelectedCurrency,
  (fiatMarketData, selectedCurrency) =>
    bnOrZero(fiatMarketData[selectedCurrency]?.price ?? 1).toString(), // fallback to USD
)

const selectAssetId = (_state: ReduxState, assetId: AssetId) => assetId

export const selectMarketDataByAssetIdUserCurrency = createCachedSelector(
  selectMarketDataUserCurrency,
  selectAssetId,
  (marketData, assetId): MarketData | undefined => {
    return marketData[assetId]
  },
)((_state: ReduxState, assetId?: AssetId): AssetId => assetId ?? 'assetId')

export const selectMarketDataByFilter = createCachedSelector(
  selectMarketDataUserCurrency,
  selectAssetIdParamFromFilter,
  (marketData, assetId): MarketData | undefined => {
    return marketData[assetId ?? '']
  },
)((_s: ReduxState, filter) => filter?.assetId ?? 'assetId')

const selectTimeframeParam = (_state: ReduxState, timeframe: HistoryTimeframe) => timeframe

export const selectCryptoPriceHistoryTimeframe = createSelector(
  marketData.selectors.selectCryptoPriceHistory,
  selectTimeframeParam,
  (priceHistory, timeframe): PriceHistoryData<AssetId> => {
    const ids = Object.keys(priceHistory[timeframe] ?? {})
    // Used as a last resort if state is already corrupted upstream
    return getTrimmedOutOfBoundsMarketData(priceHistory, timeframe, ids) ?? {}
  },
)

export const selectFiatPriceHistoryTimeframe = createSelector(
  marketData.selectors.selectFiatPriceHistory,
  preferences.selectors.selectSelectedCurrency,
  selectTimeframeParam,
  (fiatPriceHistory, selectedCurrency, timeframe): HistoryData[] => {
    // Used as a last resort if state is already corrupted upstream
    const trimmedTimeframeMarketData = getTrimmedOutOfBoundsMarketData(
      fiatPriceHistory,
      timeframe,
      [selectedCurrency],
    )
    return trimmedTimeframeMarketData?.[selectedCurrency] ?? []
  },
)

export const selectPriceHistoryByAssetTimeframe = createCachedSelector(
  (state: ReduxState, _assetId: AssetId, timeframe: HistoryTimeframe) =>
    selectCryptoPriceHistoryTimeframe(state, timeframe),
  (state: ReduxState, _assetId: AssetId, timeframe: HistoryTimeframe) =>
    selectFiatPriceHistoryTimeframe(state, timeframe),
  selectAssetId,
  (cryptoPriceHistoryForTimeframe, fiatPriceHistoryForTimeframe, assetId): HistoryData[] => {
    const assetPriceHistoryData = cryptoPriceHistoryForTimeframe[assetId] ?? []
    if (!fiatPriceHistoryForTimeframe.length) return assetPriceHistoryData // Don't unnecessarily reduce if we don't have fiat price data
    return assetPriceHistoryData.reduce<HistoryData[]>((acc, assetHistoryDate) => {
      const { price, date } = assetHistoryDate
      const fiatToUsdRate = priceAtDate({ priceHistoryData: fiatPriceHistoryForTimeframe, date })
      acc.push({ price: bnOrZero(price).times(fiatToUsdRate).toNumber(), date })
      return acc
    }, [])
  },
)((_state: ReduxState, assetId: AssetId, timeframe: HistoryTimeframe) => `${assetId}-${timeframe}`)

export const selectPriceHistoriesLoadingByAssetTimeframe = createSelector(
  marketData.selectors.selectCryptoPriceHistory,
  (_state: ReduxState, assetIds: AssetId[], _timeframe: HistoryTimeframe) => assetIds,
  (_state: ReduxState, _assetIds: AssetId[], timeframe: HistoryTimeframe) => timeframe,
  // if we don't have the data it's loading
  (priceHistory, assetIds, timeframe): boolean =>
    !assetIds.every(assetId => Boolean(priceHistory?.[timeframe]?.[assetId])),
)

export const selectUsdRateByAssetId = createCachedSelector(
  marketData.selectors.selectMarketDataUsd,
  selectAssetId,
  (marketDataUsd, assetId): string | undefined => {
    return marketDataUsd[assetId]?.price
  },
)((_state: ReduxState, assetId?: AssetId): AssetId => assetId ?? 'assetId')

export const selectUserCurrencyRateByAssetId = createCachedSelector(
  marketData.selectors.selectMarketDataUsd,
  selectUserCurrencyToUsdRate,
  selectAssetId,
  (marketDataUsd, userCurrencyToUsdRate, assetId): string => {
    return bnOrZero(marketDataUsd[assetId]?.price)
      .times(userCurrencyToUsdRate)
      .toString()
  },
)((_state: ReduxState, assetId?: AssetId): AssetId => assetId ?? 'assetId')

export const selectIsAnyMarketDataApiQueryPending = (state: ReduxState) =>
  Object.values(state.marketApi.queries).some(query => query?.status === QueryStatus.pending)
