import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { SwapperName } from 'lib/swapper/api'

export type TradeQuoteSliceState = {
  swapperName: SwapperName | undefined
}

const initialState: TradeQuoteSliceState = {
  swapperName: undefined,
}

export const tradeQuoteSlice = createSlice({
  name: 'tradeQuote',
  initialState,
  reducers: {
    clear: () => initialState,
    setSwapperName: (state, action: PayloadAction<SwapperName | undefined>) => {
      state.swapperName = action.payload
    },
  },
})
