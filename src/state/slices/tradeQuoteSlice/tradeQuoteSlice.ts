import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { SwapperName, TradeQuote } from '@shapeshiftoss/swapper'
import { orderBy, uniqBy } from 'lodash'
import type { InterpolationOptions } from 'node-polyglot'
import type { ApiQuote } from 'state/apis/swapper/types'

import { initialState, initialTradeExecutionState } from './constants'
import {
  AllowanceKey,
  HopExecutionState,
  HopKey,
  type StreamingSwapMetadata,
  TradeExecutionState,
  TransactionExecutionState,
} from './types'

export const tradeQuoteSlice = createSlice({
  name: 'tradeQuote',
  initialState,
  reducers: {
    clear: state => ({
      ...initialState,
      tradeExecution: state.tradeExecution, // Leave the trade execution state alone
    }),
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
    setConfirmedQuote: (state, action: PayloadAction<TradeQuote>) => {
      state.confirmedQuote = action.payload
      state.tradeExecution[action.payload.id] = initialTradeExecutionState
    },
    setTradeInitialized: (state, action: PayloadAction<TradeQuote['id']>) => {
      state.tradeExecution[action.payload].state = TradeExecutionState.Previewing
    },
    confirmTrade: (state, action: PayloadAction<TradeQuote['id']>) => {
      if (state.tradeExecution[action.payload].state !== TradeExecutionState.Previewing) {
        if (state.tradeExecution[action.payload].state === TradeExecutionState.Initializing) {
          console.error('attempted to confirm an uninitialized trade')
        } else {
          console.error('attempted to confirm an in-progress trade')
        }
        return
      }
      state.tradeExecution[action.payload].state = TradeExecutionState.FirstHop
      const allowanceResetRequired =
        state.tradeExecution[action.payload].firstHop.allowanceReset.isRequired
      const approvalRequired = state.tradeExecution[action.payload].firstHop.approval.isRequired
      state.tradeExecution[action.payload].firstHop.state = allowanceResetRequired
        ? HopExecutionState.AwaitingApprovalReset
        : approvalRequired
        ? HopExecutionState.AwaitingApproval
        : HopExecutionState.AwaitingSwap
    },
    setApprovalTxPending: (
      state,
      action: PayloadAction<{ hopIndex: number; isReset: boolean; id: TradeQuote['id'] }>,
    ) => {
      const { hopIndex, isReset } = action.payload
      const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      const allowanceKey = isReset ? AllowanceKey.AllowanceReset : AllowanceKey.Approval
      state.tradeExecution[action.payload.id][hopKey][allowanceKey].state =
        TransactionExecutionState.Pending
    },
    setApprovalTxFailed: (
      state,
      action: PayloadAction<{ hopIndex: number; isReset: boolean; id: TradeQuote['id'] }>,
    ) => {
      const { hopIndex, isReset } = action.payload
      const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      const allowanceKey = isReset ? AllowanceKey.AllowanceReset : AllowanceKey.Approval
      state.tradeExecution[action.payload.id][hopKey][allowanceKey].state =
        TransactionExecutionState.Failed
    },
    // marks the approval tx as complete, but the allowance check needs to pass before proceeding to swap step
    setApprovalTxComplete: (
      state,
      action: PayloadAction<{ hopIndex: number; isReset: boolean; id: TradeQuote['id'] }>,
    ) => {
      const { hopIndex, isReset } = action.payload
      const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      const allowanceKey = isReset ? AllowanceKey.AllowanceReset : AllowanceKey.Approval
      state.tradeExecution[action.payload.id][hopKey][allowanceKey].state =
        TransactionExecutionState.Complete
    },
    setApprovalResetComplete: (
      state,
      action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>,
    ) => {
      const { hopIndex } = action.payload
      const key = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      state.tradeExecution[action.payload.id][key].state = HopExecutionState.AwaitingApproval
    },
    // progresses the hop to the swap step after the allowance check has passed
    setApprovalStepComplete: (
      state,
      action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>,
    ) => {
      const { hopIndex } = action.payload
      const key = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      state.tradeExecution[action.payload.id][key].state = HopExecutionState.AwaitingSwap
    },
    setSwapTxPending: (
      state,
      action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>,
    ) => {
      const { hopIndex } = action.payload
      const key = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      state.tradeExecution[action.payload.id][key].swap.state = TransactionExecutionState.Pending
    },
    setSwapTxFailed: (state, action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>) => {
      const { hopIndex } = action.payload
      const key = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      state.tradeExecution[action.payload.id][key].swap.state = TransactionExecutionState.Failed
    },
    setSwapTxMessage: (
      state,
      action: PayloadAction<{
        id: TradeQuote['id']
        hopIndex: number
        message: string | [string, InterpolationOptions] | undefined
      }>,
    ) => {
      const { hopIndex, message } = action.payload
      const key = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      state.tradeExecution[action.payload.id][key].swap.message = message
    },
    setSwapTxComplete: (
      state,
      action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>,
    ) => {
      const { hopIndex } = action.payload
      const isMultiHopTrade =
        state.confirmedQuote !== undefined && state.confirmedQuote.steps.length > 1
      const isFirstHop = hopIndex === 0

      if (isFirstHop) {
        // complete the first hop
        state.tradeExecution[action.payload.id].firstHop.swap.state =
          TransactionExecutionState.Complete
        state.tradeExecution[action.payload.id].firstHop.swap.message = undefined
        state.tradeExecution[action.payload.id].firstHop.state = HopExecutionState.Complete

        if (isMultiHopTrade) {
          // first hop of multi hop trade - begin second hop
          state.tradeExecution[action.payload.id].state = TradeExecutionState.SecondHop
          const allowanceResetRequired =
            state.tradeExecution[action.payload.id].secondHop.allowanceReset.isRequired
          const approvalRequired =
            state.tradeExecution[action.payload.id].secondHop.approval.isRequired
          state.tradeExecution[action.payload.id].secondHop.state = allowanceResetRequired
            ? HopExecutionState.AwaitingApprovalReset
            : approvalRequired
            ? HopExecutionState.AwaitingApproval
            : HopExecutionState.AwaitingSwap
        } else {
          // first hop of single hop trade - trade complete
          state.tradeExecution[action.payload.id].state = TradeExecutionState.TradeComplete
        }
      } else {
        // complete the second hop
        state.tradeExecution[action.payload.id].secondHop.swap.state =
          TransactionExecutionState.Complete
        state.tradeExecution[action.payload.id].secondHop.swap.message = undefined
        state.tradeExecution[action.payload.id].secondHop.state = HopExecutionState.Complete

        // second hop of multi-hop trade - trade complete
        state.tradeExecution[action.payload.id].state = TradeExecutionState.TradeComplete
      }
    },
    setInitialApprovalRequirements: (
      state,
      action: PayloadAction<{ firstHop: boolean; secondHop: boolean; id: TradeQuote['id'] }>,
    ) => {
      state.tradeExecution[action.payload.id].firstHop.approval.isRequired =
        action.payload?.firstHop
      state.tradeExecution[action.payload.id].secondHop.approval.isRequired =
        action.payload?.secondHop
    },
    setAllowanceResetRequirements: (
      state,
      action: PayloadAction<{ firstHop: boolean; secondHop: boolean; id: TradeQuote['id'] }>,
    ) => {
      state.tradeExecution[action.payload.id].firstHop.allowanceReset.isRequired =
        action.payload?.firstHop
      state.tradeExecution[action.payload.id].secondHop.allowanceReset.isRequired =
        action.payload?.secondHop
    },
    setPermit2Requirements: (
      state,
      action: PayloadAction<{ firstHop: boolean; secondHop: boolean; id: TradeQuote['id'] }>,
    ) => {
      state.tradeExecution[action.payload.id].firstHop.permit2.isRequired = action.payload?.firstHop
      state.tradeExecution[action.payload.id].secondHop.permit2.isRequired =
        action.payload?.secondHop
    },
    setApprovalTxHash: (
      state,
      action: PayloadAction<{
        hopIndex: number
        txHash: string
        isReset: boolean
        id: TradeQuote['id']
      }>,
    ) => {
      const { hopIndex, txHash, isReset } = action.payload
      const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      const allowanceKey = isReset ? AllowanceKey.AllowanceReset : AllowanceKey.Approval
      state.tradeExecution[action.payload.id][hopKey][allowanceKey].txHash = txHash
    },
    setSwapSellTxHash: (
      state,
      action: PayloadAction<{ hopIndex: number; sellTxHash: string; id: TradeQuote['id'] }>,
    ) => {
      const { hopIndex, sellTxHash } = action.payload
      const key = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      state.tradeExecution[action.payload.id][key].swap.sellTxHash = sellTxHash
    },
    setSwapBuyTxHash: (
      state,
      action: PayloadAction<{ hopIndex: number; buyTxHash: string; id: TradeQuote['id'] }>,
    ) => {
      const { hopIndex, buyTxHash } = action.payload
      const key = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      state.tradeExecution[action.payload.id][key].swap.buyTxHash = buyTxHash
    },
    setStreamingSwapMeta: (
      state,
      action: PayloadAction<{
        hopIndex: number
        streamingSwapMetadata: StreamingSwapMetadata
        id: TradeQuote['id']
      }>,
    ) => {
      const { hopIndex, streamingSwapMetadata } = action.payload
      const key = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      state.tradeExecution[action.payload.id][key].swap.streamingSwap = streamingSwapMetadata
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
