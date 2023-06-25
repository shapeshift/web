import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { SwapperName } from 'lib/swapper/api'
import type { ApiQuote } from 'state/apis/swappers'

export type TradeQuoteSliceState = {
  swapperName: SwapperName | undefined
  quotes: ApiQuote[]
}

const initialState: TradeQuoteSliceState = {
  swapperName: undefined,
  quotes: [],
}

export const tradeQuoteSlice = createSlice({
  name: 'tradeQuote',
  initialState,
  reducers: {
    clear: () => initialState,
    setSwapperName: (state, action: PayloadAction<SwapperName | undefined>) => {
      state.swapperName = action.payload
    },
    setQuotes: (state, action: PayloadAction<ApiQuote[]>) => {
      state.quotes = action.payload
    },
  },
})
