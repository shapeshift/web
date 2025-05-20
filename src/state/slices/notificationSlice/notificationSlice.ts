import { createSlice } from '@reduxjs/toolkit'
import { uuidv4 } from '@walletconnect/utils'

import type { NotificationCenterState, NotificationMessage, NotificationUnion } from './types'

export const initialState: NotificationCenterState = {
  notifications: [],
}

export const notificationCenterSlice = createSlice({
  name: 'notificationCenter',
  initialState,
  reducers: create => ({
    upsertNotification: create.reducer(
      (notificationCenterState, notification: NotificationMessage) => {
        const notificationWithId: NotificationUnion = {
          ...notification.payload,
          id: uuidv4(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        notificationCenterState.notifications.unshift(notificationWithId)
      },
    ),
  }),
  selectors: {
    selectNotifications: state => state.notifications,
  },
})
