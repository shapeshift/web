import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { uuidv4 } from '@walletconnect/utils'

import type { NotificationCenterState, NotificationPayload, NotificationUnion } from './types'

export const initialState: NotificationCenterState = {
  notifications: [],
}

export const notificationCenterSlice = createSlice({
  name: 'notificationCenter',
  initialState,
  reducers: create => ({
    upsertNotification: create.reducer((state, { payload }: PayloadAction<NotificationPayload>) => {
      const notificationWithId: NotificationUnion = {
        ...payload,
        id: uuidv4(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      state.notifications.push(notificationWithId)
    }),
  }),
  selectors: {
    selectNotifications: state => state.notifications,
  },
})
