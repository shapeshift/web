import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { SwapperName, TradeQuote2 } from 'lib/swapper/api'

export type TradeQuoteSliceState = {
  activeStep: number | undefined // Make sure to actively check for undefined vs. falsy here. 0 is the first step, undefined means no active step yet
  activeSwapperName: SwapperName | undefined // the selected swapper used to find the active quote in the api response
  confirmedQuote: TradeQuote2 | undefined // the quote being executed
}

const initialState: TradeQuoteSliceState = {
  activeSwapperName: undefined,
  confirmedQuote: undefined,
  activeStep: undefined,
}

export const tradeQuoteSlice = createSlice({
  name: 'tradeQuote',
  initialState,
  reducers: {
    clear: () => initialState,
    setSwapperName: (state, action: PayloadAction<SwapperName | undefined>) => {
      state.activeSwapperName = action.payload
    },
    incrementStep: state => {
      const activeQuote = state.confirmedQuote
      const activeStepOrDefault = state.activeStep ?? 0
      if (!activeQuote) return // This should never happen as we shouldn't call this without an active quote, but double wrap never hurts for swapper
      if (activeStepOrDefault === activeQuote.steps.length - 1) return // No-op: we're on the last step - don't increment
      state.activeStep = activeStepOrDefault + 1
    },
    resetActiveStep: state => {
      state.activeStep = undefined
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
