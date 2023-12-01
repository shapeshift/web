import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { TradeQuote } from 'lib/swapper/types'

import { initialState, initialTradeExecutionState } from './constants'
import {
  HopExecutionState,
  type StreamingSwapMetadata,
  type TradeExecutionMetadata,
  TradeExecutionState,
  TransactionExecutionState,
} from './types'

export type TradeQuoteSliceState = {
  activeStep: number | undefined // Make sure to actively check for undefined vs. falsy here. 0 is the first step, undefined means no active step yet
  activeQuoteIndex: number | undefined // the selected swapper used to find the active quote in the api response
  confirmedQuote: TradeQuote | undefined // the quote being executed
  tradeExecution: TradeExecutionMetadata
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
    confirmTrade: state => {
      if (state.tradeExecution.state !== TradeExecutionState.Previewing) {
        console.error('attempted to confirm an in-progress trade')
        return
      }
      state.tradeExecution.state = TradeExecutionState.FirstHop
    },
    setApprovalTxPending: (state, action: PayloadAction<{ hopIndex: number }>) => {
      const { hopIndex } = action.payload
      const key = hopIndex === 0 ? 'firstHop' : 'secondHop'
      state.tradeExecution[key].approval.state = TransactionExecutionState.Pending
    },
    setApprovalTxFailed: (state, action: PayloadAction<{ hopIndex: number }>) => {
      const { hopIndex } = action.payload
      const key = hopIndex === 0 ? 'firstHop' : 'secondHop'
      state.tradeExecution[key].approval.state = TransactionExecutionState.Failed
    },
    setApprovalTxComplete: (state, action: PayloadAction<{ hopIndex: number }>) => {
      const { hopIndex } = action.payload
      const key = hopIndex === 0 ? 'firstHop' : 'secondHop'
      state.tradeExecution[key].approval.state = TransactionExecutionState.Complete
      state.tradeExecution[key].state = HopExecutionState.AwaitingSwap
    },
    setSwapTxPending: (state, action: PayloadAction<{ hopIndex: number }>) => {
      const { hopIndex } = action.payload
      const key = hopIndex === 0 ? 'firstHop' : 'secondHop'
      state.tradeExecution[key].swap.state = TransactionExecutionState.Pending
    },
    setSwapTxFailed: (state, action: PayloadAction<{ hopIndex: number }>) => {
      const { hopIndex } = action.payload
      const key = hopIndex === 0 ? 'firstHop' : 'secondHop'
      state.tradeExecution[key].swap.state = TransactionExecutionState.Failed
    },
    setSwapTxComplete: (state, action: PayloadAction<{ hopIndex: number }>) => {
      const { hopIndex } = action.payload
      const isMultiHopTrade =
        state.confirmedQuote !== undefined && state.confirmedQuote.steps.length > 1
      switch (hopIndex) {
        case 0:
          state.tradeExecution.firstHop.swap.state = TransactionExecutionState.Complete
          state.tradeExecution.state = isMultiHopTrade
            ? TradeExecutionState.SecondHop
            : TradeExecutionState.TradeComplete
          break
        case 1:
          state.tradeExecution.secondHop.swap.state = TransactionExecutionState.Complete
          state.tradeExecution.state = TradeExecutionState.TradeComplete
          break
        default:
          console.error(`invalid hopIndex ${hopIndex}`)
      }
    },
    setInitialApprovalRequirements: (
      state,
      action: PayloadAction<{ firstHop: boolean; secondHop: boolean } | undefined>,
    ) => {
      state.tradeExecution.firstHop.approval.isRequired = action.payload?.firstHop
      state.tradeExecution.secondHop.approval.isRequired = action.payload?.secondHop
    },
    setFirstHopApprovalTxHash: (state, action: PayloadAction<string>) => {
      state.tradeExecution.firstHop.approval.txHash = action.payload
    },
    setSecondHopApprovalTxHash: (state, action: PayloadAction<string>) => {
      state.tradeExecution.secondHop.approval.txHash = action.payload
    },
    setFirstHopApprovalState: (state, action: PayloadAction<TransactionExecutionState>) => {
      state.tradeExecution.firstHop.approval.state = action.payload
    },
    setSecondHopApprovalState: (state, action: PayloadAction<TransactionExecutionState>) => {
      state.tradeExecution.secondHop.approval.state = action.payload
    },
    setFirstHopSwapState: (state, action: PayloadAction<TransactionExecutionState>) => {
      state.tradeExecution.firstHop.swap.state = action.payload
    },
    setSecondHopSwapState: (state, action: PayloadAction<TransactionExecutionState>) => {
      state.tradeExecution.secondHop.swap.state = action.payload
    },
    setFirstHopSwapSellTxHash: (state, action: PayloadAction<string>) => {
      state.tradeExecution.firstHop.swap.sellTxHash = action.payload
    },
    setSecondHopSwapSellTxHash: (state, action: PayloadAction<string>) => {
      state.tradeExecution.secondHop.swap.sellTxHash = action.payload
    },
    setFirstHopSwapBuyTxHash: (state, action: PayloadAction<string>) => {
      state.tradeExecution.firstHop.swap.buyTxHash = action.payload
    },
    setSecondHopSwapBuyTxHash: (state, action: PayloadAction<string>) => {
      state.tradeExecution.secondHop.swap.buyTxHash = action.payload
    },
    setFirstHopStreamingSwapMeta: (state, action: PayloadAction<StreamingSwapMetadata>) => {
      state.tradeExecution.firstHop.swap.streamingSwap = action.payload
    },
    setSecondHopStreamingSwapMeta: (state, action: PayloadAction<StreamingSwapMetadata>) => {
      state.tradeExecution.secondHop.swap.streamingSwap = action.payload
    },
  },
})
