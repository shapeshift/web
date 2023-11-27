import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { TradeQuote } from 'lib/swapper/types'

import { MultiHopExecutionState } from './types'
import { getNextTradeExecutionState } from './utils'

export type TradeQuoteSliceState = {
  activeStep: number | undefined // Make sure to actively check for undefined vs. falsy here. 0 is the first step, undefined means no active step yet
  activeQuoteIndex: number | undefined // the selected swapper used to find the active quote in the api response
  confirmedQuote: TradeQuote | undefined // the quote being executed
  tradeExecutionState: MultiHopExecutionState
  initialApprovalRequirements: [boolean, boolean] | undefined // whether each hop requires approval - calculated when user confirms a quote
}

const initialState: TradeQuoteSliceState = {
  activeQuoteIndex: undefined,
  confirmedQuote: undefined,
  activeStep: undefined,
  tradeExecutionState: MultiHopExecutionState.Previewing,
  initialApprovalRequirements: undefined,
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
      // this should never happen but if it does exit to prevent corrupting the current state
      if (state.initialApprovalRequirements === undefined) {
        return
      }

      const isMultiHopTrade =
        state.confirmedQuote !== undefined && state.confirmedQuote.steps.length > 1

      const [firstHopRequiresApproval, secondHopRequiresApproval] =
        state.initialApprovalRequirements

      state.tradeExecutionState = getNextTradeExecutionState(
        state.tradeExecutionState,
        isMultiHopTrade,
        firstHopRequiresApproval,
        secondHopRequiresApproval,
      )
    },
    setInitialApprovalRequirements: (
      state,
      action: PayloadAction<[boolean, boolean] | undefined>,
    ) => {
      state.initialApprovalRequirements = action.payload
    },
  },
})
