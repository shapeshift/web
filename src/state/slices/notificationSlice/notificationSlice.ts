import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { uuidv4 } from '@walletconnect/utils'

import type {
  NotificationCenterState,
  NotificationPayload,
  NotificationUnion,
  NotificationUpdatePayload,
} from './types'
import {
  isLimitOrderDiscriminator,
  isTradeDiscriminator,
  isTransactionDiscriminator,
} from './types'

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
    upsertOrUpdateNotification: create.reducer(
      (state, { payload }: PayloadAction<NotificationPayload>) => {
        const notificationIndex = (() => {
          if (isLimitOrderDiscriminator(payload)) {
            return state.notifications.findIndex(
              notification => notification.limitOrderId === payload.limitOrderId,
            )
          }

          if (isTradeDiscriminator(payload)) {
            return state.notifications.findIndex(
              notification => notification.swapId === payload.swapId,
            )
          }

          if (isTransactionDiscriminator(payload)) {
            return state.notifications.findIndex(notification => notification.id === payload.id)
          }

          return -1
        })()

        if (notificationIndex !== -1) {
          state.notifications[notificationIndex] = {
            ...state.notifications[notificationIndex],
            ...payload,
            updatedAt: Date.now(),
          }
        } else {
          state.notifications.push({
            id: uuidv4(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            ...payload,
          })
        }
      },
    ),
    updateNotification: create.reducer(
      (state, { payload }: PayloadAction<NotificationUpdatePayload>) => {
        const notificationIndex = (() => {
          if (isLimitOrderDiscriminator(payload)) {
            return state.notifications.findIndex(
              notification => notification.limitOrderId === payload.limitOrderId,
            )
          }

          if (isTradeDiscriminator(payload)) {
            return state.notifications.findIndex(
              notification => notification.swapId === payload.swapId,
            )
          }

          if (isTransactionDiscriminator(payload)) {
            return state.notifications.findIndex(notification => notification.id === payload.id)
          }

          return -1
        })()

        if (notificationIndex !== -1) {
          state.notifications[notificationIndex] = {
            ...state.notifications[notificationIndex],
            ...payload,
            updatedAt: Date.now(),
          }
        }
      },
    ),
  }),
  selectors: {
    selectNotifications: state => state.notifications,
  },
})
