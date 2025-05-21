import type { AssetId } from '@shapeshiftoss/caip'

import type { TxId } from '../txHistorySlice/txHistorySlice'

export enum NotificationType {
  Deposit = 'Deposit',
  Claim = 'Claim',
  Swap = 'Swap',
  Limit = 'Limit',
  Send = 'Send',
}

export enum NotificationStatus {
  Pending = 'Pending',
  Complete = 'Complete',
  Failed = 'Failed',
  ClaimAvailable = 'ClaimAvailable',
  Claimed = 'Claimed',
  Open = 'Open',
  Expired = 'Expired',
  Cancelled = 'Cancelled',
}

export type NotificationId = string

export type Notification = {
  id: NotificationId
  type: NotificationType
  status: NotificationStatus
  txIds?: unknown
  createdAt: number
  updatedAt: number
  title: string
  assetIds: AssetId[]
  relatedNotificationIds: NotificationId[]
  swapId?: unknown
  limitOrderId?: unknown
}

export type TransactionNotification = Notification & {
  txIds: TxId[]
}

export type TradeNotification = Notification & {
  swapId: string
}

export type LimitOrderNotification = Notification & {
  limitOrderId: string
}

export type NotificationUnion = Notification | TransactionNotification

export type NotificationCenterState = {
  notifications: NotificationUnion[]
}

export type NotificationPayload = Omit<NotificationUnion, 'id' | 'createdAt' | 'updatedAt'>
export type NotificationUpdatePayload = Partial<NotificationUnion>

export const isTransactionDiscriminator = (
  notification: Partial<Notification>,
): notification is TransactionNotification => {
  return Boolean(notification.type === NotificationType.Send && notification.txIds)
}

export const isTradeDiscriminator = (
  notification: Partial<Notification>,
): notification is TradeNotification => {
  return Boolean(notification.type === NotificationType.Swap && notification.swapId)
}

export const isLimitOrderDiscriminator = (
  notification: Partial<Notification>,
): notification is LimitOrderNotification => {
  return Boolean(notification.type === NotificationType.Limit && notification.limitOrderId)
}
