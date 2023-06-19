import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { SwapErrorRight, SwapperName, TradeQuote } from 'lib/swapper/api'

export type TradeQuoteSliceState = {
  swapperName: SwapperName | undefined
  quote: TradeQuote | undefined
  error: SwapErrorRight | undefined
}

const initialState: TradeQuoteSliceState = {
  swapperName: undefined,
  quote: undefined,
  error: undefined,
}

export const tradeQuoteSlice = createSlice({
  name: 'tradeQuote',
  initialState,
  reducers: {
    clear: () => initialState,
    setSwapperName: (state, action: PayloadAction<SwapperName>) => {
      state.swapperName = action.payload
    },
    setQuote: (state, action: PayloadAction<TradeQuote | undefined>) => {
      state.quote = action.payload
    },
    setError: (state, action: PayloadAction<SwapErrorRight | undefined>) => {
      state.error = action.payload
    },
  },
})
