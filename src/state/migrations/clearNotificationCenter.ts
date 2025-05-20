import type { PersistPartial } from 'redux-persist/es/persistReducer'

import { initialState } from '@/state/slices/notificationSlice/notificationSlice'
import type { NotificationCenterState } from '@/state/slices/notificationSlice/types'

export const clearNotificationCenter = (
  _state: NotificationCenterState,
): NotificationCenterState & PersistPartial => {
  // Migration to clear notificationCenter state
  return initialState as NotificationCenterState & PersistPartial
}
