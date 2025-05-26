import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { uuidv4 } from '@walletconnect/utils'

import type { Action, ActionCenterState, ActionPayload, ActionUpdatePayload } from './types'
import { isLimitOrderPayloadDiscriminator, isTradePayloadDiscriminator } from './types'

export const initialState: ActionCenterState = {
  actions: [],
}

export const actionCenterSlice = createSlice({
  name: 'actionCenter',
  initialState,
  reducers: create => ({
    upsertAction: create.reducer((state, { payload }: PayloadAction<ActionPayload>) => {
      // as an extra safety avoid deduplicating actions with the same swapId as they should be unique
      if (isTradePayloadDiscriminator(payload) && payload.metadata?.swapId) {
        const existingActionIndex = state.actions.findIndex(
          action =>
            isTradePayloadDiscriminator(action) &&
            action.metadata.swapId === payload.metadata.swapId,
        )

        if (existingActionIndex !== -1) {
          return
        }
      }

      const actionWithId: Action = {
        ...payload,
        id: uuidv4(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      state.actions.push(actionWithId)
    }),
    updateAction: create.reducer((state, { payload }: PayloadAction<ActionUpdatePayload>) => {
      if (
        !payload.id &&
        !isTradePayloadDiscriminator(payload) &&
        !isLimitOrderPayloadDiscriminator(payload)
      )
        return

      const actionIndex = (() => {
        if (isLimitOrderPayloadDiscriminator(payload)) {
          return state.actions.findIndex(
            action =>
              isLimitOrderPayloadDiscriminator(action) &&
              action.metadata.limitOrderId === payload.metadata.limitOrderId,
          )
        }

        if (isTradePayloadDiscriminator(payload)) {
          return state.actions.findIndex(
            action =>
              isTradePayloadDiscriminator(action) &&
              action.metadata.swapId === payload.metadata.swapId,
          )
        }

        return -1
      })()

      if (actionIndex === -1) return

      const existingAction = state.actions[actionIndex]

      const action = {
        ...existingAction,
        ...payload,
        updatedAt: Date.now(),
        // ts is borked there, couldn't find any cleaner solution than a cast for simplicity
      } as Action

      state.actions[actionIndex] = action
    }),
  }),
  selectors: {
    selectActions: state => state.actions,
  },
})
