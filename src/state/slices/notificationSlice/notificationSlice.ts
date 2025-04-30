import { createSlice } from '@reduxjs/toolkit'

import type { NotificationCenter, NotificationMessage } from './types'

export const initialState: NotificationCenter = {
  notifications: [],
}

export const notificationSlice = createSlice({
  name: 'notificationCenter',
  initialState,
  reducers: create => ({
    onNotification: create.reducer((notificationCenterState, { payload }: NotificationMessage) => {
      notificationCenterState.notifications.unshift(payload)
    }),
  }),
  selectors: {
    selectNotifications: state => state.notifications,
  },
})
