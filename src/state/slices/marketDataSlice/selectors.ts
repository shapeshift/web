import { createSelector } from '@reduxjs/toolkit'
import { CAIP19 } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import { ReduxState } from 'state/reducer'

export const selectMarketData = (state: ReduxState) => state.marketData.byId

const selectAssetId = (_state: ReduxState, assetId: CAIP19, ...args: any[]) => assetId

export const selectMarketDataById = createSelector(
  selectMarketData,
  selectAssetId,
  (marketData, assetId) => marketData[assetId]?.data,
)

export const selectMarketDataUnavailableById = createSelector(
  selectMarketData,
  selectAssetId,
  (marketData, assetId) => marketData[assetId]?.data === null,
)

export const selectMarketDataErroredById = createSelector(
  selectMarketData,
  selectAssetId,
  (marketData, assetId) => Boolean(marketData[assetId]?.errored),
)

// assets we have loaded market data for
export const selectMarketDataIds = (state: ReduxState) => state.marketData.ids

// if we don't have it it's loading
export const selectMarketDataLoadingById = createSelector(
  selectMarketDataById,
  (assetMarketData): boolean => isEmpty(assetMarketData),
)

export const selectPriceHistory = (state: ReduxState) => state.marketData.priceHistory

export const selectPriceHistoryByAssetTimeframe = createSelector(
  selectPriceHistory,
  selectAssetId,
  (_state: ReduxState, _assetId: CAIP19, timeframe: HistoryTimeframe) => timeframe,
  (priceHistory, assetId, timeframe) => priceHistory[timeframe][assetId]?.data ?? [],
)

export const selectAssetPriceHistoryErrored = createSelector(
  selectPriceHistory,
  selectAssetId,
  (_state: ReduxState, _assetId: CAIP19, timeframe: HistoryTimeframe) => timeframe,
  (priceHistory, assetId, timeframe) => Boolean(priceHistory[timeframe][assetId]?.errored),
)

export const selectPriceHistoriesEmptyByAssetTimeframe = createSelector(
  selectPriceHistory,
  (_state: ReduxState, assetIds: CAIP19[], _timeframe: HistoryTimeframe) => assetIds,
  (_state: ReduxState, _assetIds: CAIP19[], timeframe: HistoryTimeframe) => timeframe,
  (priceHistory, assetIds, timeframe) =>
    assetIds.filter(assetId => priceHistory[timeframe][assetId]?.data?.length === 0),
)

export const selectPriceHistoriesLoadingByAssetTimeframe = createSelector(
  selectPriceHistory,
  (_state: ReduxState, assetIds: CAIP19[], _timeframe: HistoryTimeframe) => assetIds,
  (_state: ReduxState, _assetIds: CAIP19[], timeframe: HistoryTimeframe) => timeframe,
  // if we don't have the data it's loading
  (priceHistory, assetIds, timeframe) =>
    !assetIds.every(assetId => Boolean(priceHistory[timeframe][assetId]?.data)),
)

export const selectPriceHistoriesErroredByAssetTimeframe = createSelector(
  selectPriceHistory,
  (_state: ReduxState, assetIds: CAIP19[], _timeframe: HistoryTimeframe) => assetIds,
  (_state: ReduxState, _assetIds: CAIP19[], timeframe: HistoryTimeframe) => timeframe,
  (priceHistory, assetIds, timeframe) =>
    assetIds.filter(assetId => priceHistory[timeframe][assetId]?.errored),
)

export const selectPriceHistoryTimeframe = createSelector(
  selectPriceHistory,
  (_state: ReduxState, timeframe: HistoryTimeframe) => timeframe,
  (priceHistory, timeframe) => priceHistory[timeframe],
)
