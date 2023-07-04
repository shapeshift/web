import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { SwapperName, TradeQuote2 } from 'lib/swapper/api'

export type TradeQuoteSliceState = {
  activeSwapperName: SwapperName | undefined // the selected swapper used to find the active quote in the api response
  confirmedQuote: TradeQuote2 | undefined // the quote being executed
}

const initialState: TradeQuoteSliceState = {
  activeSwapperName: undefined,
  confirmedQuote: undefined,
}

export const tradeQuoteSlice = createSlice({
  name: 'tradeQuote',
  initialState,
  reducers: {
    clear: () => initialState,
    setSwapperName: (state, action: PayloadAction<SwapperName | undefined>) => {
      state.activeSwapperName = action.payload
    },
    resetSwapperName: state => {
      state.activeSwapperName = undefined
    },
    setConfirmedQuote: (state, action: PayloadAction<TradeQuote2 | undefined>) => {
      state.confirmedQuote = action.payload
    },
    resetConfirmedQuote: state => {
      state.confirmedQuote = undefined
    },
  },
})
