import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { Swap } from '@shapeshiftoss/swapper'

import type { SwapState, UpdateSwapPayload } from './types'

export const initialState: SwapState = {
  swaps: [],
}

export const swapSlice = createSlice({
  name: 'swaps',
  initialState,
  reducers: create => ({
    upsertSwap: create.reducer((state, { payload: swap }: PayloadAction<Swap>) => {
      const existingSwapIndex = state.swaps.findIndex(s => s.quoteId === swap.quoteId)

      // if the swap already exists, don't add it again as an extra safety
      if (existingSwapIndex !== -1) return

      state.swaps.push(swap)
    }),
    updateSwap: create.reducer((state, { payload: swap }: PayloadAction<UpdateSwapPayload>) => {
      const index = state.swaps.findIndex(s => s.id === swap.id)
      if (index !== -1) {
        state.swaps[index] = {
          ...state.swaps[index],
          ...swap,
        }
      }
    }),
  }),
  selectors: {
    selectSwaps: state => state.swaps,
  },
})
