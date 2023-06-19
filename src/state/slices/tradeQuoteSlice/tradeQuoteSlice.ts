import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { SwapperName, TradeQuote } from 'lib/swapper/api'

export type TradeQuoteSliceState = {
  swapperName: SwapperName | undefined
  quote: TradeQuote | undefined
}

const initialState: TradeQuoteSliceState = {
  swapperName: undefined,
  quote: undefined,
}

export const tradeQuoteSlice = createSlice({
  name: 'tradeQuote',
  initialState,
  reducers: {
    clear: () => initialState,
    setSwapperName: (state, action: PayloadAction<SwapperName>) => {
      state.swapperName = action.payload
    },
    setQuote: (state, action: PayloadAction<TradeQuote>) => {
      state.quote = action.payload
    },
  },
})
