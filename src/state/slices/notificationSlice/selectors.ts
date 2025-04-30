import { notificationSlice } from './notificationSlice'

import { createDeepEqualOutputSelector } from '@/state/selector-utils'

export const selectNotificationsByUpdatedAtDesc = createDeepEqualOutputSelector(
  notificationSlice.selectors.selectNotifications,
  notifications => notifications.sort((a, b) => b.updatedAt - a.updatedAt),
)
