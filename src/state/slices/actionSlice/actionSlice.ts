import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'

import type { Action, ActionState } from './types'

export const initialState: ActionState = {
  byId: {},
  ids: [],
}

export const actionSlice = createSlice({
  name: 'action',
  initialState,
  reducers: create => ({
    upsertAction: create.reducer((state, { payload }: PayloadAction<Action>) => {
      if (state.byId[payload.id]) {
        state.byId[payload.id] = {
          ...state.byId[payload.id],
          ...payload,
          // ensure we do *never* use payload createdAt for updates
          // only case we should use it is for inserts
          createdAt: state.byId[payload.id]?.createdAt || payload.createdAt,
          updatedAt: Date.now(),
        }
      } else {
        state.byId[payload.id] = payload
        state.ids.push(payload.id)
      }
    }),
    deleteAction: create.reducer((state, { payload }: PayloadAction<string>) => {
      delete state.byId[payload]
      state.ids = state.ids.filter(id => id !== payload)
    }),
  }),
  selectors: {
    selectActionsById: state => state.byId,
    selectActionIds: state => state.ids,
  },
})
