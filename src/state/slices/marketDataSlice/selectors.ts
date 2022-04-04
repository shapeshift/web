import { createSelector } from '@reduxjs/toolkit'
import { CAIP19 } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import { ReduxState } from 'state/reducer'

import { marketApi } from './marketDataSlice'

export const selectMarketData = (state: ReduxState) => state.marketData.byId
const selectAssetIdWithState = (_state: ReduxState, assetId: CAIP19, ...args: any[]) => assetId
const selectTimeframeWithState = (
  _state: ReduxState,
  _assetIds: CAIP19 | CAIP19[],
  timeframe: HistoryTimeframe
) => timeframe

const selectAssetId = (assetId: CAIP19, ...args: any[]) => assetId
const selectAssetIds = (assetIds: CAIP19[], ...args: any[]) => assetIds
const selectTimeframe = (_assetIds: CAIP19 | CAIP19[], timeframe: HistoryTimeframe) => timeframe

export const selectMarketDataById = createSelector(
  selectMarketData,
  selectAssetIdWithState,
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
  selectAssetIdWithState,
  selectTimeframeWithState,
  (priceHistory, assetId, timeframe) => priceHistory[timeframe][assetId] ?? []
)

const selectPriceHistoryQueryByAssetTimeframe = createSelector(
  selectAssetId,
  selectTimeframe,
  (assetId, timeframe) =>
    marketApi.endpoints.findPriceHistoryByCaip19.select({ assetId, timeframe })
)

export const selectPriceHistoryLoadingByAssetTimeframe = createSelector(
  selectPriceHistoryQueryByAssetTimeframe,
  querySelector => (state: ReduxState) => querySelector(state).isLoading
)

export const selectPriceHistoryUnavailableByAssetTimeframe = createSelector(
  selectPriceHistoryQueryByAssetTimeframe,
  querySelector => (state: ReduxState) =>
    querySelector(state).isSuccess && querySelector(state).data?.length === 0
)

export const selectPriceHistoriesLoadingByAssetTimeframe = createSelector(
  selectAssetIds,
  selectTimeframe,
  // if one is loading then we consider it loading
  (assetIds, timeframe) => (state: ReduxState) =>
    assetIds.some(assetId => selectPriceHistoryLoadingByAssetTimeframe(assetId, timeframe)(state))
)

export const selectPriceHistoriesUnavailableByAssetTimeframe = createSelector(
  selectAssetIds,
  selectTimeframe,
  // if all is unavailable then we consider it unavailable
  (assetIds, timeframe) => (state: ReduxState) => {
    if (assetIds.length === 0) {
      return false
    }
    return assetIds.every(assetId =>
      selectPriceHistoryUnavailableByAssetTimeframe(assetId, timeframe)(state)
    )
  }
)

export const selectPriceHistoryTimeframe = createSelector(
  selectPriceHistory,
  (_state: ReduxState, timeframe: HistoryTimeframe) => timeframe,
  (priceHistory, timeframe) => priceHistory[timeframe]
)
