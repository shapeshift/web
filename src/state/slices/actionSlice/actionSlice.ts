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
          updatedAt: Date.now(),
        }
      } else {
        state.byId[payload.id] = payload
        state.ids.push(payload.id)
      }
    }),
  }),
  selectors: {
    selectActionsById: state => state.byId,
    selectActionIds: state => state.ids,
    selectActions: state => state.ids.map(id => state.byId[id]),
  },
})
