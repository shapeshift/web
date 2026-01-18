import { createSelector } from '@reduxjs/toolkit'

import type { ReduxState } from '@/state/reducer'

import type { StopLossOrder, StopLossState } from './types'

const selectStopLossState = (state: ReduxState): StopLossState => state.stopLoss

export const selectActiveQuote = createSelector(
    selectStopLossState,
    stopLoss => stopLoss.activeQuote,
)

export const selectAllOrders = createSelector(
    selectStopLossState,
    stopLoss => Object.values(stopLoss.orders),
)

export const selectOrdersMap = createSelector(
    selectStopLossState,
    stopLoss => stopLoss.orders,
)

export const selectOrderById = createSelector(
    [selectOrdersMap, (_state: ReduxState, orderId: string) => orderId],
    (orders, orderId): StopLossOrder | undefined => orders[orderId],
)

export const selectActiveOrders = createSelector(selectAllOrders, orders =>
    orders.filter(order => order.status === 'active'),
)

export const selectPendingOrders = createSelector(selectAllOrders, orders =>
    orders.filter(order => order.status === 'pending'),
)

export const selectTriggeredOrders = createSelector(selectAllOrders, orders =>
    orders.filter(order => order.status === 'triggered'),
)

export const selectExecutedOrders = createSelector(selectAllOrders, orders =>
    orders.filter(order => order.status === 'executed'),
)

export const selectCancelledOrders = createSelector(selectAllOrders, orders =>
    orders.filter(order => order.status === 'cancelled'),
)

export const selectOrderSubmissionById = createSelector(
    [selectStopLossState, (_state: ReduxState, orderId: string) => orderId],
    (stopLoss, orderId) => stopLoss.orderSubmission[orderId],
)

export const selectHasActiveOrders = createSelector(
    selectActiveOrders,
    activeOrders => activeOrders.length > 0,
)

export const selectOrdersByAsset = createSelector(
    [selectAllOrders, (_state: ReduxState, sellAssetId: string) => sellAssetId],
    (orders, sellAssetId) => orders.filter(order => order.params.sellAssetId === sellAssetId),
)

export const selectActiveOrdersByAsset = createSelector(
    [selectActiveOrders, (_state: ReduxState, sellAssetId: string) => sellAssetId],
    (orders, sellAssetId) => orders.filter(order => order.params.sellAssetId === sellAssetId),
)
