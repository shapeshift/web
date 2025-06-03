import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'

import type { Action, ActionState, PartialActionUpdate } from './types'
import {
  isLimitOrderAction,
  isPartialActionUpdateById,
  isPartialLimitOrderActionUpdate,
  isPartialSwapActionUpdate,
  isSwapAction,
} from './types'

export const initialState: ActionState = {
  byId: {},
  ids: [],
}

export const actionSlice = createSlice({
  name: 'action',
  initialState,
  reducers: create => ({
    upsertAction: create.reducer(
      (state, { payload }: PayloadAction<Action | PartialActionUpdate>) => {
        if (isPartialSwapActionUpdate(payload)) {
          const existingActionId = state.ids.find(id => {
            const action = state.byId[id]
            return (
              isSwapAction(action) && action.swapMetadata.swapId === payload.swapMetadata.swapId
            )
          })

          if (!existingActionId) {
            console.warn(`No existing swap action found for swapId: ${payload.swapMetadata.swapId}`)
            return
          }

          const existingAction = state.byId[existingActionId]
          if (!isSwapAction(existingAction)) {
            console.warn(
              `Action found but not a swap action for swapId: ${payload.swapMetadata.swapId}`,
            )
            return
          }

          state.byId[existingActionId] = {
            ...existingAction,
            ...payload,
            swapMetadata: {
              ...existingAction.swapMetadata,
              ...payload.swapMetadata,
            },
            updatedAt: Date.now(),
          } as Action
          return
        }

        if (isPartialLimitOrderActionUpdate(payload)) {
          const existingActionId = state.ids.find(id => {
            const action = state.byId[id]
            return (
              isLimitOrderAction(action) &&
              action.limitOrderMetadata.quoteId === payload.limitOrderMetadata.quoteId
            )
          })

          if (!existingActionId) {
            console.warn(
              `No existing limit order action found for quoteId: ${payload.limitOrderMetadata.quoteId}`,
            )
            return
          }

          const existingAction = state.byId[existingActionId]
          if (!isLimitOrderAction(existingAction)) {
            console.warn(
              `Action found but not a limit order action for quoteId: ${payload.limitOrderMetadata.quoteId}`,
            )
            return
          }

          state.byId[existingActionId] = {
            ...existingAction,
            ...payload,
            limitOrderMetadata: {
              ...existingAction.limitOrderMetadata,
              ...payload.limitOrderMetadata,
            },
            updatedAt: Date.now(),
          } as Action
          return
        }

        if (isPartialActionUpdateById(payload)) {
          if (!state.byId[payload.id]) {
            console.warn(`No existing action found for id: ${payload.id}`)
            return
          }

          const existingAction = state.byId[payload.id]
          state.byId[payload.id] = {
            ...existingAction,
            ...payload,
            swapMetadata: isSwapAction(existingAction) ? existingAction.swapMetadata : undefined,
            limitOrderMetadata: isLimitOrderAction(existingAction)
              ? existingAction.limitOrderMetadata
              : undefined,
            updatedAt: Date.now(),
          } as Action
          return
        }

        // @TODO: handle other action types
      },
    ),
  }),
  selectors: {
    selectActionsById: state => state.byId,
    selectActionIds: state => state.ids,
    selectActions: state => state.ids.map(id => state.byId[id]),
  },
})
