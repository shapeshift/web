import { createSelector } from '@reduxjs/toolkit'
import { CAIP19 } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import { ReduxState } from 'state/reducer'

import { marketApi } from './marketDataSlice'

export const selectMarketData = (state: ReduxState) => state.marketData.byId

const selectAppState = (state: ReduxState) => state
const selectAssetId = (_state: ReduxState, assetId: CAIP19, ...args: any[]) => assetId
const selectAssetIds = (_state: ReduxState, assetIds: CAIP19[], ...args: any[]) => assetIds
const selectTimeframe = (
  _state: ReduxState,
  _assetIds: CAIP19 | CAIP19[],
  timeframe: HistoryTimeframe
) => timeframe

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
  selectTimeframe,
  (priceHistory, assetId, timeframe) => priceHistory[timeframe][assetId] ?? []
)

const selectPriceHistoryQueryByAssetTimeframe = createSelector(
  selectAssetId,
  selectTimeframe,
  (assetId, timeframe) =>
    marketApi.endpoints.findPriceHistoryByCaip19.select({ assetId, timeframe })
)

export const selectPriceHistoryLoadingByAssetTimeframe = createSelector(
  selectAppState,
  selectPriceHistoryQueryByAssetTimeframe,
  (state: ReduxState, querySelector) => querySelector(state).isLoading
)

export const selectPriceHistoryUnavailableByAssetTimeframe = createSelector(
  selectAppState,
  selectPriceHistoryQueryByAssetTimeframe,
  (state: ReduxState, querySelector) =>
    querySelector(state).isSuccess && querySelector(state).data?.length === 0
)

export const selectPriceHistoriesLoadingByAssetTimeframe = createSelector(
  selectAppState,
  selectAssetIds,
  selectTimeframe,
  // if one is loading then we consider it loading
  (state, assetIds, timeframe) =>
    assetIds.some(assetId => selectPriceHistoryLoadingByAssetTimeframe(state, assetId, timeframe))
)

export const selectPriceHistoriesUnavailableByAssetTimeframe = createSelector(
  selectAppState,
  selectAssetIds,
  selectTimeframe,
  // if all is unavailable then we consider it unavailable
  (state, assetIds, timeframe) => {
    if (assetIds.length === 0) {
      return false
    }
    return assetIds.every(assetId =>
      selectPriceHistoryUnavailableByAssetTimeframe(state, assetId, timeframe)
    )
  }
)

export const selectPriceHistoryTimeframe = createSelector(
  selectPriceHistory,
  (_state: ReduxState, timeframe: HistoryTimeframe) => timeframe,
  (priceHistory, timeframe) => priceHistory[timeframe]
)
