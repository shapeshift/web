import type { TxId } from '../txHistorySlice/txHistorySlice'

export enum NotificationType {
  Deposit = 'Deposit',
  Claim = 'Claim',
  Swap = 'Swap',
  Limit = 'Limit',
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

export type Notification = {
  id: string
  type: NotificationType
  status: NotificationStatus
  txId?: TxId
  createdAt: number
  updatedAt: number
}

export type TransactionNotification = Notification & {
  txId: TxId
}

export type NotificationCenter = {
  notifications: Notification[]
}

export type NotificationMessage = {
  payload: Notification
}

export const isTransactionNotification = (
  notification: Notification,
): notification is TransactionNotification => {
  return (
    notification.type === NotificationType.Deposit ||
    notification.type === NotificationType.Claim ||
    notification.type === NotificationType.Swap ||
    notification.type === NotificationType.Limit
  )
}
