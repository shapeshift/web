import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { TradeQuote } from 'lib/swapper/types'

import type { HopExecutionMetadata } from './types'
import { HopExecutionState, MultiHopExecutionState } from './types'
import { getHopExecutionStates, getNextTradeExecutionState } from './utils'

export type TradeQuoteSliceState = {
  activeStep: number | undefined // Make sure to actively check for undefined vs. falsy here. 0 is the first step, undefined means no active step yet
  activeQuoteIndex: number | undefined // the selected swapper used to find the active quote in the api response
  confirmedQuote: TradeQuote | undefined // the quote being executed
  tradeExecution: {
    state: MultiHopExecutionState
    firstHop: HopExecutionMetadata
    secondHop: HopExecutionMetadata
  }
}

const initialTradeExecutionState = {
  state: MultiHopExecutionState.Previewing,
  firstHop: { state: HopExecutionState.Pending },
  secondHop: { state: HopExecutionState.Pending },
}

const initialState: TradeQuoteSliceState = {
  activeQuoteIndex: undefined,
  confirmedQuote: undefined,
  activeStep: undefined,
  tradeExecution: initialTradeExecutionState,
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
      state.tradeExecution = initialTradeExecutionState
    },
    resetConfirmedQuote: state => {
      state.confirmedQuote = undefined
      state.tradeExecution = initialTradeExecutionState
    },
    incrementTradeExecutionState: state => {
      // this should never happen but if it does, exit to prevent corrupting the current state
      if (
        state.tradeExecution.firstHop.approvalRequired === undefined ||
        state.tradeExecution.secondHop.approvalRequired === undefined
      ) {
        console.error('initial approval requirements not set')
        return
      }

      const isMultiHopTrade =
        state.confirmedQuote !== undefined && state.confirmedQuote.steps.length > 1

      const firstHopRequiresApproval = state.tradeExecution.firstHop.approvalRequired
      const secondHopRequiresApproval = state.tradeExecution.secondHop.approvalRequired

      state.tradeExecution.state = getNextTradeExecutionState(
        state.tradeExecution.state,
        isMultiHopTrade,
        firstHopRequiresApproval,
        secondHopRequiresApproval,
      )

      const { firstHop: firstHopState, secondHop: secondHopState } = getHopExecutionStates(
        state.tradeExecution.state,
      )
      state.tradeExecution.firstHop.state = firstHopState
      state.tradeExecution.secondHop.state = secondHopState
    },
    setInitialApprovalRequirements: (
      state,
      action: PayloadAction<{ firstHop: boolean; secondHop: boolean } | undefined>,
    ) => {
      state.tradeExecution.firstHop.approvalRequired = action.payload?.firstHop
      state.tradeExecution.secondHop.approvalRequired = action.payload?.secondHop
    },
  },
})
