import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { SwapperName } from 'lib/swapper/api'
import type { ApiQuote } from 'state/apis/swappers'

export type TradeQuoteSliceState = {
  swapperName: SwapperName | undefined
  quotes: ApiQuote[]
  lastRequestStartTime: number | undefined
}

const initialState: TradeQuoteSliceState = {
  swapperName: undefined,
  quotes: [],
  lastRequestStartTime: undefined,
}

export const tradeQuoteSlice = createSlice({
  name: 'tradeQuote',
  initialState,
  reducers: {
    clear: () => initialState,
    setSwapperName: (state, action: PayloadAction<SwapperName | undefined>) => {
      state.swapperName = action.payload
    },
    setQuotes: (state, action: PayloadAction<{ quotes: ApiQuote[]; queryStartTime: number }>) => {
      if (
        !state.lastRequestStartTime ||
        action.payload.queryStartTime > state.lastRequestStartTime
      ) {
        state.quotes = action.payload.quotes
        state.swapperName = action.payload.quotes[0]?.swapperName
        state.lastRequestStartTime = action.payload.queryStartTime
      }
    },
  },
})
