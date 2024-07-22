import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { SwapperName, TradeQuote } from '@shapeshiftoss/swapper'
import { orderBy, uniqBy } from 'lodash'
import type { ApiQuote } from 'state/apis/swapper/types'

import { initialState, initialTradeExecutionState } from './constants'
import {
  HopExecutionState,
  type StreamingSwapMetadata,
  TradeExecutionState,
  TransactionExecutionState,
} from './types'

export const tradeQuoteSlice = createSlice({
  name: 'tradeQuote',
  initialState,
  reducers: {
    clear: () => initialState,
    setIsTradeQuoteRequestAborted: (state, action: PayloadAction<boolean>) => {
      state.isTradeQuoteRequestAborted = action.payload
    },
    upsertTradeQuotes: (
      state,
      action: PayloadAction<{
        swapperName: SwapperName
        quotesById: Record<string, ApiQuote> | undefined
      }>,
    ) => {
      const { swapperName, quotesById } = action.payload
      state.tradeQuotes[swapperName] = quotesById ?? {}
    },
    setActiveQuote: (state, action: PayloadAction<ApiQuote | undefined>) => {
      if (action.payload === undefined) {
        state.activeQuoteMeta = undefined
      } else {
        const { swapperName, id } = action.payload
        state.activeQuoteMeta = {
          swapperName,
          identifier: id,
        }
      }
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
    resetActiveQuote: state => {
      state.activeQuoteMeta = undefined
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
      const allowanceResetRequired = state.tradeExecution.firstHop.allowanceReset.isRequired
      const approvalRequired = state.tradeExecution.firstHop.approval.isRequired
      state.tradeExecution.firstHop.state = allowanceResetRequired
        ? HopExecutionState.AwaitingApprovalReset
        : approvalRequired
        ? HopExecutionState.AwaitingApproval
        : HopExecutionState.AwaitingSwap
    },
    setApprovalTxPending: (
      state,
      action: PayloadAction<{ hopIndex: number; isReset: boolean }>,
    ) => {
      const { hopIndex, isReset } = action.payload
      const hopKey = hopIndex === 0 ? 'firstHop' : 'secondHop'
      const allowanceKey = isReset ? 'allowanceReset' : 'approval'
      state.tradeExecution[hopKey][allowanceKey].state = TransactionExecutionState.Pending
    },
    setApprovalTxFailed: (state, action: PayloadAction<{ hopIndex: number; isReset: boolean }>) => {
      const { hopIndex, isReset } = action.payload
      const hopKey = hopIndex === 0 ? 'firstHop' : 'secondHop'
      const allowanceKey = isReset ? 'allowanceReset' : 'approval'
      state.tradeExecution[hopKey][allowanceKey].state = TransactionExecutionState.Failed
      if (allowanceKey === 'allowanceReset') {
        state.tradeExecution[hopKey].state = HopExecutionState.AwaitingApproval
      }
    },
    // marks the approval tx as complete, but the allowance check needs to pass before proceeding to swap step
    setApprovalTxComplete: (
      state,
      action: PayloadAction<{ hopIndex: number; isReset: boolean }>,
    ) => {
      const { hopIndex, isReset } = action.payload
      const hopKey = hopIndex === 0 ? 'firstHop' : 'secondHop'
      const allowanceKey = isReset ? 'allowanceReset' : 'approval'
      state.tradeExecution[hopKey][allowanceKey].state = TransactionExecutionState.Complete
      if (allowanceKey === 'allowanceReset') {
        state.tradeExecution[hopKey].state = HopExecutionState.AwaitingApproval
      }
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
          const allowanceResetRequired = state.tradeExecution.secondHop.allowanceReset.isRequired
          const approvalRequired = state.tradeExecution.secondHop.approval.isRequired
          state.tradeExecution.secondHop.state = allowanceResetRequired
            ? HopExecutionState.AwaitingApprovalReset
            : approvalRequired
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
    setAllowanceResetRequirements: (
      state,
      action: PayloadAction<{ firstHop: boolean; secondHop: boolean } | undefined>,
    ) => {
      state.tradeExecution.firstHop.allowanceReset.isRequired = action.payload?.firstHop
      state.tradeExecution.secondHop.allowanceReset.isRequired = action.payload?.secondHop
    },
    setApprovalTxHash: (
      state,
      action: PayloadAction<{ hopIndex: number; txHash: string; isReset: boolean }>,
    ) => {
      const { hopIndex, txHash, isReset } = action.payload
      const hopKey = hopIndex === 0 ? 'firstHop' : 'secondHop'
      const allowanceKey = isReset ? 'allowanceReset' : 'approval'
      state.tradeExecution[hopKey][allowanceKey].txHash = txHash
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
    updateTradeQuoteDisplayCache: (
      state,
      action: PayloadAction<{
        isTradeQuoteApiQueryPending: Partial<Record<SwapperName, boolean>>
        isSwapperQuoteAvailable: Record<SwapperName, boolean>
        sortedQuotes: ApiQuote[]
      }>,
    ) => {
      const { isTradeQuoteApiQueryPending, isSwapperQuoteAvailable, sortedQuotes } = action.payload

      // Mark stale quotes as stale.
      // Assign the original array index so we can keep loading quotes roughly in their original spot
      // in the list. This makes loading state less jarring visually because quotes tend to move
      // around less as results arrive.
      const staleQuotes = state.tradeQuoteDisplayCache
        .map((quoteData, originalIndex) => {
          return Object.assign({}, quoteData, { isStale: true, originalIndex })
        })
        .filter(quoteData => {
          return (
            isTradeQuoteApiQueryPending[quoteData.swapperName] ||
            !isSwapperQuoteAvailable[quoteData.swapperName]
          )
        })

      const sortedQuotesWithOriginalIndex = sortedQuotes.map((quoteData, originalIndex) => {
        return Object.assign({}, quoteData, { isStale: false, originalIndex })
      })

      const allQuotes = uniqBy(sortedQuotesWithOriginalIndex.concat(staleQuotes), 'id')

      const sortQuotes = (
        unorderedQuotes: ({ originalIndex: number } & ApiQuote)[],
      ): ApiQuote[] => {
        return orderBy(
          unorderedQuotes,
          ['originalIndex', 'inputOutputRatio', 'swapperName'],
          ['asc', 'desc', 'asc'],
        )
      }

      const happyQuotes = sortQuotes(allQuotes.filter(({ errors }) => errors.length === 0))
      const errorQuotes = sortQuotes(allQuotes.filter(({ errors }) => errors.length > 0))

      state.tradeQuoteDisplayCache = happyQuotes.concat(errorQuotes)
    },
  },
})
