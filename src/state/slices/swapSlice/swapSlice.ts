import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { Swap } from '@shapeshiftoss/swapper'

import type { SwapState } from './types'

export const initialState: SwapState = {
  byId: {},
  ids: [],
  currentSwapId: null,
}

export const swapSlice = createSlice({
  name: 'swap',
  initialState,
  reducers: create => ({
    upsertSwap: create.reducer((state, { payload: swap }: PayloadAction<Swap>) => {
      if (state.byId[swap.id]) {
        state.byId[swap.id] = {
          ...state.byId[swap.id],
          ...swap,
        }
      } else {
        state.byId[swap.id] = swap
        state.ids.push(swap.id)
      }

      state.currentSwapId = swap.id
    }),
  }),
  selectors: {
    selectSwapsById: state => state.byId,
    selectSwapIds: state => state.ids,
    selectCurrentSwapId: state => state.currentSwapId,
  },
})
