import { createSelector } from '@reduxjs/toolkit'
import { CAIP19 } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import { ReduxState } from 'state/reducer'

import { marketApi } from './marketDataSlice'

export const selectMarketData = (state: ReduxState) => state.marketData.byId

const selectAssetId = (_state: ReduxState, assetId: CAIP19, ...args: any[]) => assetId

export const selectMarketDataById = createSelector(
  selectMarketData,
  selectAssetId,
  (marketData, assetId) => marketData[assetId]
)

// assets we have loaded market data for
export const selectMarketDataIds = (state: ReduxState) => state.marketData.ids

// if we don't have it it's loading
export const selectMarketDataLoadingById = createSelector(
  selectMarketDataById,
  (assetMarketData): boolean => isEmpty(assetMarketData)
)

export const selectPriceHistory = (state: ReduxState) => state.marketData.priceHistory

export const selectPriceHistoryByAssetTimeframe = createSelector(
  selectPriceHistory,
  selectAssetId,
  (_state: ReduxState, _assetId: CAIP19, timeframe: HistoryTimeframe) => timeframe,
  (priceHistory, assetId, timeframe) => priceHistory[timeframe][assetId] ?? []
)

export const selectPriceHistoriesLoadingByAssetTimeframe = createSelector(
  selectPriceHistory,
  (_state: ReduxState, assetIds: CAIP19[], _timeframe: HistoryTimeframe) => assetIds,
  (_state: ReduxState, _assetIds: CAIP19[], timeframe: HistoryTimeframe) => timeframe,
  // if we don't have the data it's loading
  (priceHistory, assetIds, timeframe) =>
    !assetIds.every(assetId => Boolean(priceHistory[timeframe][assetId]))
)

const selectPriceHistoryQueryByAssetTimeframe = createSelector(
  (_state: ReduxState, assetId: CAIP19, _timeframe: HistoryTimeframe) => assetId,
  (_state: ReduxState, _assetId: CAIP19, timeframe: HistoryTimeframe) => timeframe,
  (assetId, timeframe) =>
    marketApi.endpoints.findPriceHistoryByCaip19.select({ assetId, timeframe })
)

export const selectPriceHistoryLoadingByAssetTimeframe = createSelector(
  (state: ReduxState) => state,
  selectPriceHistoryQueryByAssetTimeframe,
  (state: ReduxState, querySelector) => querySelector(state).isLoading
)

export const selectPriceHistoryUnavailableByAssetTimeframe = createSelector(
  (state: ReduxState, _assetId: CAIP19, _timeframe: HistoryTimeframe) => state,
  selectPriceHistoryQueryByAssetTimeframe,
  (state: ReduxState, querySelector) =>
    querySelector(state).isSuccess && querySelector(state).data?.length === 0
)

export const selectPriceHistoryTimeframe = createSelector(
  selectPriceHistory,
  (_state: ReduxState, timeframe: HistoryTimeframe) => timeframe,
  (priceHistory, timeframe) => priceHistory[timeframe]
)
