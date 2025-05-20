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
  txIds?: TxId[]
  createdAt: number
  updatedAt: number
  title: string
  assetIds: AssetId[]
  relatedNotificationIds: NotificationId[]
}

export type TransactionNotification = Notification & {
  txIds: TxId[]
}

export type NotificationUnion = Notification | TransactionNotification

export type NotificationCenterState = {
  notifications: NotificationUnion[]
}

export type NotificationPayload = Omit<NotificationUnion, 'id' | 'createdAt' | 'updatedAt'>

export const isTransactionNotification = (
  notification: Notification,
): notification is TransactionNotification => {
  return (
    notification.type === NotificationType.Deposit ||
    notification.type === NotificationType.Claim ||
    notification.type === NotificationType.Swap ||
    notification.type === NotificationType.Limit ||
    notification.type === NotificationType.Send
  )
}
