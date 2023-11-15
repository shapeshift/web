import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { TradeQuote } from 'lib/swapper/types'

import { MultiHopExecutionStatus } from './types'

export type TradeQuoteSliceState = {
  activeStep: number | undefined // Make sure to actively check for undefined vs. falsy here. 0 is the first step, undefined means no active step yet
  activeQuoteIndex: number | undefined // the selected swapper used to find the active quote in the api response
  confirmedQuote: TradeQuote | undefined // the quote being executed
  tradeExecutionStatus: MultiHopExecutionStatus
}

const initialState: TradeQuoteSliceState = {
  activeQuoteIndex: undefined,
  confirmedQuote: undefined,
  activeStep: undefined,
  tradeExecutionStatus: MultiHopExecutionStatus.Previewing,
}

export const tradeQuoteSlice = createSlice({
  name: 'tradeQuote',
  initialState,
  reducers: {
    clear: () => initialState,
    setActiveQuoteIndex: (state, action: PayloadAction<number | undefined>) => {
      state.activeQuoteIndex = action.payload
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
    resetActiveQuoteIndex: state => {
      state.activeQuoteIndex = undefined
    },
    setConfirmedQuote: (state, action: PayloadAction<TradeQuote | undefined>) => {
      state.confirmedQuote = action.payload
    },
    resetConfirmedQuote: state => {
      state.confirmedQuote = undefined
    },
    incrementTradeExecutionState: state => {
      if (state.tradeExecutionStatus === MultiHopExecutionStatus.TradeComplete) return

      const isMultiHopTrade =
        state.confirmedQuote !== undefined && state.confirmedQuote.steps.length > 1

      // skip second hop states for single hop trades
      if (
        isMultiHopTrade &&
        state.tradeExecutionStatus > MultiHopExecutionStatus.Hop1AwaitingTradeExecution
      ) {
        state.tradeExecutionStatus = MultiHopExecutionStatus.TradeComplete
      }

      state.tradeExecutionStatus += 1 as MultiHopExecutionStatus
    },
  },
})
