import { notificationCenterSlice } from './notificationSlice'
import type { NotificationId, NotificationUnion } from './types'
import { NotificationStatus } from './types'

import { createDeepEqualOutputSelector } from '@/state/selector-utils'

export const selectNotificationsByCreatedAtDesc = createDeepEqualOutputSelector(
  notificationCenterSlice.selectors.selectNotifications,
  notifications => {
    return notifications.sort((a, b) => b.createdAt - a.createdAt)
  },
)

export const selectHasPendingNotifications = createDeepEqualOutputSelector(
  notificationCenterSlice.selectors.selectNotifications,
  notifications =>
    notifications.some(notification => notification.status === NotificationStatus.Pending),
)

export const selectPendingNotifications = createDeepEqualOutputSelector(
  notificationCenterSlice.selectors.selectNotifications,
  notifications => {
    return notifications.filter(notification => notification.status === NotificationStatus.Pending)
  },
)

export const selectNotificationIds = createDeepEqualOutputSelector(
  notificationCenterSlice.selectors.selectNotifications,
  notifications => {
    return notifications.map(notification => notification.id)
  },
)

export const selectRelatedNotificationsByNotificationId = createDeepEqualOutputSelector(
  notificationCenterSlice.selectors.selectNotifications,
  selectNotificationIds,
  (notifications, notificationIds) =>
    notificationIds.reduce<Record<NotificationId, NotificationUnion[]>>((acc, notificationId) => {
      const relatedNotifications = notifications.filter(notification =>
        notification.relatedNotificationIds.includes(notificationId),
      )

      return { ...acc, [notificationId]: relatedNotifications }
    }, {}),
)

export const selectPendingNotificationsWithoutRelatedSuccessOrError = createDeepEqualOutputSelector(
  notificationCenterSlice.selectors.selectNotifications,
  selectRelatedNotificationsByNotificationId,
  (notifications, relatedNotificationIdsByNotificationId) => {
    return notifications.filter(notification => {
      if (notification.status !== NotificationStatus.Pending) return false

      const hasRelatedSuccessOrError = relatedNotificationIdsByNotificationId[
        notification.id
      ]?.some(
        n => n.status === NotificationStatus.Complete || n.status === NotificationStatus.Failed,
      )

      return !hasRelatedSuccessOrError
    })
  },
)
