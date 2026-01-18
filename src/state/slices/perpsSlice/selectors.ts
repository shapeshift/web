import { createSelector } from '@reduxjs/toolkit'
import { bn } from '@shapeshiftoss/utils'
import createCachedSelector from 're-reselect'

import { PerpsOrderSubmissionState, perpsSlice } from './perpsSlice'

import type { AugmentedMarket, ParsedPosition } from '@/lib/hyperliquid/types'
import type { ReduxState } from '@/state/reducer'
import { createDeepEqualOutputSelector } from '@/state/selector-utils'

export const {
  selectSelectedMarket,
  selectMarkets,
  selectMarketsLoading,
  selectMarketsError,
  selectOrderbook,
  selectOrderbookLoading,
  selectOrderbookError,
  selectPositions,
  selectPositionsLoading,
  selectPositionsError,
  selectOpenOrders,
  selectOpenOrdersLoading,
  selectOpenOrdersError,
  selectAccountState,
  selectAccountStateLoading,
  selectAccountStateError,
  selectOrderForm,
  selectOrderFormSide,
  selectOrderFormType,
  selectOrderFormPrice,
  selectOrderFormSize,
  selectOrderFormLeverage,
  selectOrderSubmission,
  selectOrderSubmissionState,
  selectChartInterval,
  selectIsWalletInitialized,
  selectWalletAddress,
  selectLastUpdateTimestamp,
  selectSelectedMarketData,
  selectHasOpenPositions,
  selectHasOpenOrders,
  selectAccountValue,
  selectWithdrawable,
  selectTotalMarginUsed,
} = perpsSlice.selectors

export const selectMarketByCoin = createCachedSelector(
  selectMarkets,
  (_state: ReduxState, coin: string) => coin,
  (markets, coin): AugmentedMarket | undefined => markets.find(m => m.coin === coin),
)((_state: ReduxState, coin: string): string => coin ?? 'undefined')

export const selectPositionByCoin = createCachedSelector(
  selectPositions,
  (_state: ReduxState, coin: string) => coin,
  (positions, coin): ParsedPosition | undefined => positions.find(p => p.coin === coin),
)((_state: ReduxState, coin: string): string => coin ?? 'undefined')

export const selectOpenOrdersByCoin = createCachedSelector(
  selectOpenOrders,
  (_state: ReduxState, coin: string) => coin,
  (orders, coin) => orders.filter(o => o.coin === coin),
)((_state: ReduxState, coin: string): string => coin ?? 'undefined')

export const selectIsAnyDataLoading = createSelector(
  selectMarketsLoading,
  selectOrderbookLoading,
  selectPositionsLoading,
  selectOpenOrdersLoading,
  selectAccountStateLoading,
  (marketsLoading, orderbookLoading, positionsLoading, openOrdersLoading, accountStateLoading) =>
    marketsLoading ||
    orderbookLoading ||
    positionsLoading ||
    openOrdersLoading ||
    accountStateLoading,
)

export const selectHasAnyError = createSelector(
  selectMarketsError,
  selectOrderbookError,
  selectPositionsError,
  selectOpenOrdersError,
  selectAccountStateError,
  (marketsError, orderbookError, positionsError, openOrdersError, accountStateError) =>
    Boolean(
      marketsError || orderbookError || positionsError || openOrdersError || accountStateError,
    ),
)

export const selectFirstError = createSelector(
  selectMarketsError,
  selectOrderbookError,
  selectPositionsError,
  selectOpenOrdersError,
  selectAccountStateError,
  (marketsError, orderbookError, positionsError, openOrdersError, accountStateError) =>
    marketsError || orderbookError || positionsError || openOrdersError || accountStateError,
)

export const selectIsOrderSubmitting = createSelector(
  selectOrderSubmissionState,
  state =>
    state === PerpsOrderSubmissionState.Signing || state === PerpsOrderSubmissionState.Submitting,
)

export const selectIsOrderIdle = createSelector(
  selectOrderSubmissionState,
  state => state === PerpsOrderSubmissionState.Idle,
)

export const selectIsOrderComplete = createSelector(
  selectOrderSubmissionState,
  state => state === PerpsOrderSubmissionState.Complete,
)

export const selectIsOrderFailed = createSelector(
  selectOrderSubmissionState,
  state => state === PerpsOrderSubmissionState.Failed,
)

export const selectOrderbookMidPrice = createSelector(selectOrderbook, orderbook => {
  if (!orderbook?.bids?.length || !orderbook?.asks?.length) return undefined
  const bestBid = orderbook.bids[0]?.price
  const bestAsk = orderbook.asks[0]?.price
  if (!bestBid || !bestAsk) return undefined
  return bn(bestBid).plus(bestAsk).div(2).toString()
})

export const selectOrderbookSpread = createSelector(selectOrderbook, orderbook => {
  if (!orderbook?.bids?.length || !orderbook?.asks?.length) return undefined
  const bestBid = orderbook.bids[0]?.price
  const bestAsk = orderbook.asks[0]?.price
  if (!bestBid || !bestAsk) return undefined
  return bn(bestAsk).minus(bestBid).toString()
})

export const selectOrderbookSpreadPercent = createSelector(
  selectOrderbookSpread,
  selectOrderbookMidPrice,
  (spread, midPrice) => {
    if (!spread || !midPrice) return undefined
    return bn(spread).div(midPrice).times(100).toString()
  },
)

export const selectTotalUnrealizedPnl = createDeepEqualOutputSelector(selectPositions, positions =>
  positions.reduce((total, position) => bn(total).plus(position.unrealizedPnl).toString(), '0'),
)

export const selectPositionCount = createSelector(selectPositions, positions => positions.length)

export const selectOpenOrderCount = createSelector(selectOpenOrders, orders => orders.length)

export const selectMarketCoins = createDeepEqualOutputSelector(selectMarkets, markets =>
  markets.map(m => m.coin),
)

export const selectMarketsCount = createSelector(selectMarkets, markets => markets.length)

export const selectIsReadyToTrade = createSelector(
  selectIsWalletInitialized,
  selectWalletAddress,
  selectAccountState,
  selectMarketsLoading,
  selectMarketsError,
  (isWalletInitialized, walletAddress, accountState, marketsLoading, marketsError) =>
    isWalletInitialized &&
    Boolean(walletAddress) &&
    Boolean(accountState) &&
    !marketsLoading &&
    !marketsError,
)

export const selectOrderFormReduceOnly = createSelector(
  selectOrderForm,
  orderForm => orderForm.reduceOnly,
)

export const selectOrderFormPostOnly = createSelector(
  selectOrderForm,
  orderForm => orderForm.postOnly,
)

export const selectOrderFormTimeInForce = createSelector(
  selectOrderForm,
  orderForm => orderForm.timeInForce,
)

export const selectOrderFormTakeProfitPrice = createSelector(
  selectOrderForm,
  orderForm => orderForm.takeProfitPrice,
)

export const selectOrderFormStopLossPrice = createSelector(
  selectOrderForm,
  orderForm => orderForm.stopLossPrice,
)

export const selectIsValidOrderForm = createSelector(
  selectOrderFormPrice,
  selectOrderFormSize,
  selectOrderFormType,
  (price, size, orderType) => {
    const hasValidSize = bn(size).gt(0)
    const hasValidPrice = orderType === 'Market' || bn(price).gt(0)
    return hasValidSize && hasValidPrice
  },
)

export const selectSelectedMarketPosition = createSelector(
  selectPositions,
  selectSelectedMarket,
  (positions, selectedMarket): ParsedPosition | undefined => {
    if (!selectedMarket) return undefined
    return positions.find(p => p.coin === selectedMarket)
  },
)

export const selectSelectedMarketOrders = createDeepEqualOutputSelector(
  selectOpenOrders,
  selectSelectedMarket,
  (orders, selectedMarket) => {
    if (!selectedMarket) return []
    return orders.filter(o => o.coin === selectedMarket)
  },
)

export const selectAvailableMargin = createSelector(selectAccountState, accountState => {
  if (!accountState) return undefined
  const accountValue = bn(accountState.marginSummary.accountValue)
  const marginUsed = bn(accountState.marginSummary.totalMarginUsed)
  return accountValue.minus(marginUsed).toString()
})

export const selectMarginUsagePercent = createSelector(selectAccountState, accountState => {
  if (!accountState) return undefined
  const accountValue = bn(accountState.marginSummary.accountValue)
  const marginUsed = bn(accountState.marginSummary.totalMarginUsed)
  if (accountValue.isZero()) return '0'
  return marginUsed.div(accountValue).times(100).toString()
})
