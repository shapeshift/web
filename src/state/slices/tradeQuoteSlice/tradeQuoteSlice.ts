import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { TradeQuote } from '@shapeshiftoss/swapper'
import type { ApiQuote } from 'state/apis/swapper'

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
  activeQuoteId: string | undefined // the selected quote id used to find the active quote in the api responses
  confirmedQuote: TradeQuote | undefined // the quote being executed
  tradeExecution: TradeExecutionMetadata
  tradeQuotes: Record<string, Omit<ApiQuote, 'index'>> // mapping from quoteId to ApiQuote
}

export const tradeQuoteSlice = createSlice({
  name: 'tradeQuote',
  initialState,
  reducers: {
    clear: () => initialState,
    upsertTradeQuotes: (state, action: PayloadAction<Record<string, Omit<ApiQuote, 'index'>>>) => {
      state.tradeQuotes = Object.assign(state.tradeQuotes, action.payload)
    },
    setActiveQuoteIndex: (state, action: PayloadAction<string | undefined>) => {
      state.activeQuoteId = action.payload
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
      state.activeQuoteId = undefined
    },
    setConfirmedQuote: (state, action: PayloadAction<TradeQuote | undefined>) => {
      state.confirmedQuote = action.payload
      state.tradeExecution = initialTradeExecutionState
    },
    resetConfirmedQuote: state => {
      state.confirmedQuote = undefined
      state.tradeExecution = initialTradeExecutionState
    },
    setTradeInitialized: state => {
      state.tradeExecution.state = TradeExecutionState.Previewing
    },
    confirmTrade: state => {
      if (state.tradeExecution.state !== TradeExecutionState.Previewing) {
        if (state.tradeExecution.state === TradeExecutionState.Initializing) {
          console.error('attempted to confirm an uninitialized trade')
        } else {
          console.error('attempted to confirm an in-progress trade')
        }
        return
      }
      state.tradeExecution.state = TradeExecutionState.FirstHop
      const approvalRequired = state.tradeExecution.firstHop.approval.isRequired
      state.tradeExecution.firstHop.state = approvalRequired
        ? HopExecutionState.AwaitingApproval
        : HopExecutionState.AwaitingSwap
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
    // marks the approval tx as complete, but the allowance check needs to pass before proceeding to swap step
    setApprovalTxComplete: (state, action: PayloadAction<{ hopIndex: number }>) => {
      const { hopIndex } = action.payload
      const key = hopIndex === 0 ? 'firstHop' : 'secondHop'
      state.tradeExecution[key].approval.state = TransactionExecutionState.Complete
    },
    // progresses the hop to the swap step after the allowance check has passed
    setApprovalStepComplete: (state, action: PayloadAction<{ hopIndex: number }>) => {
      const { hopIndex } = action.payload
      const key = hopIndex === 0 ? 'firstHop' : 'secondHop'
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
    setSwapTxMessage: (
      state,
      action: PayloadAction<{ hopIndex: number; message: string | undefined }>,
    ) => {
      const { hopIndex, message } = action.payload
      const key = hopIndex === 0 ? 'firstHop' : 'secondHop'
      state.tradeExecution[key].swap.message = message
    },
    setSwapTxComplete: (state, action: PayloadAction<{ hopIndex: number }>) => {
      const { hopIndex } = action.payload
      const isMultiHopTrade =
        state.confirmedQuote !== undefined && state.confirmedQuote.steps.length > 1
      const isFirstHop = hopIndex === 0

      if (isFirstHop) {
        // complete the first hop
        state.tradeExecution.firstHop.swap.state = TransactionExecutionState.Complete
        state.tradeExecution.firstHop.swap.message = undefined
        state.tradeExecution.firstHop.state = HopExecutionState.Complete

        if (isMultiHopTrade) {
          // first hop of multi hop trade - begin second hop
          state.tradeExecution.state = TradeExecutionState.SecondHop
          const approvalRequired = state.tradeExecution.secondHop.approval.isRequired
          state.tradeExecution.secondHop.state = approvalRequired
            ? HopExecutionState.AwaitingApproval
            : HopExecutionState.AwaitingSwap
        } else {
          // first hop of single hop trade - trade complete
          state.tradeExecution.state = TradeExecutionState.TradeComplete
        }
      } else {
        // complete the second hop
        state.tradeExecution.secondHop.swap.state = TransactionExecutionState.Complete
        state.tradeExecution.secondHop.swap.message = undefined
        state.tradeExecution.secondHop.state = HopExecutionState.Complete

        // second hop of multi-hop trade - trade complete
        state.tradeExecution.state = TradeExecutionState.TradeComplete
      }
    },
    setInitialApprovalRequirements: (
      state,
      action: PayloadAction<{ firstHop: boolean; secondHop: boolean } | undefined>,
    ) => {
      state.tradeExecution.firstHop.approval.isRequired = action.payload?.firstHop
      state.tradeExecution.secondHop.approval.isRequired = action.payload?.secondHop
    },
    setApprovalTxHash: (state, action: PayloadAction<{ hopIndex: number; txHash: string }>) => {
      const { hopIndex, txHash } = action.payload
      const key = hopIndex === 0 ? 'firstHop' : 'secondHop'
      state.tradeExecution[key].approval.txHash = txHash
    },
    setSwapSellTxHash: (state, action: PayloadAction<{ hopIndex: number; sellTxHash: string }>) => {
      const { hopIndex, sellTxHash } = action.payload
      const key = hopIndex === 0 ? 'firstHop' : 'secondHop'
      state.tradeExecution[key].swap.sellTxHash = sellTxHash
    },
    setSwapBuyTxHash: (state, action: PayloadAction<{ hopIndex: number; buyTxHash: string }>) => {
      const { hopIndex, buyTxHash } = action.payload
      const key = hopIndex === 0 ? 'firstHop' : 'secondHop'
      state.tradeExecution[key].swap.buyTxHash = buyTxHash
    },
    setStreamingSwapMeta: (
      state,
      action: PayloadAction<{ hopIndex: number; streamingSwapMetadata: StreamingSwapMetadata }>,
    ) => {
      const { hopIndex, streamingSwapMetadata } = action.payload
      const key = hopIndex === 0 ? 'firstHop' : 'secondHop'
      state.tradeExecution[key].swap.streamingSwap = streamingSwapMetadata
    },
  },
})
