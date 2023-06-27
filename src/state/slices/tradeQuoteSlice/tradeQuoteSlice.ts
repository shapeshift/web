import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { SwapErrorRight, SwapperName, TradeQuote2 } from 'lib/swapper/api'

export type TradeQuoteSliceState = {
  swapperName: SwapperName | undefined
  quote: TradeQuote2 | undefined
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
    setSwapperName: (state, action: PayloadAction<SwapperName | undefined>) => {
      state.swapperName = action.payload
    },
    setQuote: (state, action: PayloadAction<TradeQuote2 | undefined>) => {
      state.quote = action.payload
    },
    setError: (state, action: PayloadAction<SwapErrorRight | undefined>) => {
      state.error = action.payload
    },
  },
})
