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
      const tradeQuoteId = action.payload
      if (state.tradeExecution[tradeQuoteId].state !== TradeExecutionState.Previewing) {
        if (state.tradeExecution[tradeQuoteId].state === TradeExecutionState.Initializing) {
          console.error('attempted to confirm an uninitialized trade')
        } else {
          console.error('attempted to confirm an in-progress trade')
        }
        return
      }

      state.tradeExecution[tradeQuoteId].state = TradeExecutionState.FirstHop

      const allowanceResetRequired =
        state.tradeExecution[tradeQuoteId].firstHop.allowanceReset.isRequired
      const approvalRequired =
        state.tradeExecution[tradeQuoteId].firstHop.allowanceApproval.isInitiallyRequired
      const permit2Required = state.tradeExecution[tradeQuoteId].firstHop.permit2.isRequired

      switch (true) {
        case allowanceResetRequired:
          state.tradeExecution[tradeQuoteId].firstHop.state =
            HopExecutionState.AwaitingAllowanceReset
          break
        case approvalRequired:
          state.tradeExecution[tradeQuoteId].firstHop.state =
            HopExecutionState.AwaitingAllowanceApproval
          break
        case permit2Required:
          state.tradeExecution[tradeQuoteId].firstHop.state = HopExecutionState.AwaitingPermit2
          break
        default:
          state.tradeExecution[tradeQuoteId].firstHop.state = HopExecutionState.AwaitingSwap
          break
      }
    },
    setAllowanceResetTxPending: (
      state,
      action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>,
    ) => {
      const { hopIndex, id } = action.payload
      const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      const allowanceKey = AllowanceKey.AllowanceReset
      state.tradeExecution[id][hopKey][allowanceKey].state = TransactionExecutionState.Pending
    },
    setAllowanceApprovalTxPending: (
      state,
      action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>,
    ) => {
      const { hopIndex, id } = action.payload
      const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      const allowanceKey = AllowanceKey.AllowanceApproval
      state.tradeExecution[id][hopKey][allowanceKey].state = TransactionExecutionState.Pending
    },
    setPermit2SignaturePending: (
      state,
      action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>,
    ) => {
      const { hopIndex, id } = action.payload
      const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      state.tradeExecution[id][hopKey].permit2.state = TransactionExecutionState.Pending
    },
    setAllowanceResetTxFailed: (
      state,
      action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>,
    ) => {
      const { hopIndex, id } = action.payload
      const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      const allowanceKey = AllowanceKey.AllowanceApproval
      state.tradeExecution[id][hopKey][allowanceKey].state = TransactionExecutionState.Failed
    },
    setAllowanceApprovalTxFailed: (
      state,
      action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>,
    ) => {
      const { hopIndex, id } = action.payload
      const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      const allowanceKey = AllowanceKey.AllowanceApproval
      state.tradeExecution[id][hopKey][allowanceKey].state = TransactionExecutionState.Failed
    },
    setPermit2SignatureFailed: (
      state,
      action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>,
    ) => {
      const { hopIndex, id } = action.payload
      const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      state.tradeExecution[id][hopKey].permit2.state = TransactionExecutionState.Failed
    },
    setAllowanceResetTxComplete: (
      state,
      action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>,
    ) => {
      const { hopIndex, id } = action.payload
      const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      const allowanceKey = AllowanceKey.AllowanceReset
      state.tradeExecution[id][hopKey][allowanceKey].state = TransactionExecutionState.Complete
    },
    // marks the approval tx as complete, but the allowance check needs to pass before proceeding to swap step
    setAllowanceApprovalTxComplete: (
      state,
      action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>,
    ) => {
      const { hopIndex, id } = action.payload
      const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      const allowanceKey = AllowanceKey.AllowanceApproval
      state.tradeExecution[id][hopKey][allowanceKey].state = TransactionExecutionState.Complete
    },
    setPermit2SignatureComplete: (
      state,
      action: PayloadAction<{ hopIndex: number; id: TradeQuote['id']; permit2Signature: string }>,
    ) => {
      const { hopIndex, id, permit2Signature } = action.payload
      const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      state.tradeExecution[id][hopKey].permit2.state = TransactionExecutionState.Complete
      state.tradeExecution[id][hopKey].permit2.permit2Signature = permit2Signature

      // Mark the whole Permit2 step complete. We can do this here because no on-chain processing is
      // required, unlike allowance reset and allowance approval.
      state.tradeExecution[id][hopKey].state = HopExecutionState.AwaitingSwap
    },
    // This is deliberately disjoint to the allowance reset transaction orchestration to allow users to
    // complete an approval externally and have the app respond to the updated allowance on chain.
    setAllowanceResetStepComplete: (
      state,
      action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>,
    ) => {
      const { hopIndex, id } = action.payload
      const key = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop

      // Don't update the state if we're on a different stage of the flow
      if (state.tradeExecution[id][key].state !== HopExecutionState.AwaitingAllowanceReset) {
        return
      }

      state.tradeExecution[id][key].state = HopExecutionState.AwaitingAllowanceApproval
    },
    // This is deliberately disjoint to the allowance approval transaction orchestration to allow users to
    // complete an approval externally and have the app respond to the updated allowance on chain.
    setAllowanceApprovalStepComplete: (
      state,
      action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>,
    ) => {
      const { hopIndex, id } = action.payload
      const key = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop

      // Don't update the state if we're on a different stage of the flow
      if (state.tradeExecution[id][key].state !== HopExecutionState.AwaitingAllowanceApproval) {
        return
      }

      const permit2Required = state.tradeExecution[id][key].permit2.isRequired
      state.tradeExecution[id][key].state = permit2Required
        ? HopExecutionState.AwaitingPermit2
        : HopExecutionState.AwaitingSwap
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
            state.tradeExecution[action.payload.id].secondHop.allowanceApproval.isRequired
          state.tradeExecution[action.payload.id].secondHop.state = allowanceResetRequired
            ? HopExecutionState.AwaitingAllowanceReset
            : approvalRequired
            ? HopExecutionState.AwaitingAllowanceApproval
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
      state.tradeExecution[action.payload.id].firstHop.allowanceApproval.isRequired =
        action.payload?.firstHop
      state.tradeExecution[action.payload.id].secondHop.allowanceApproval.isRequired =
        action.payload?.secondHop
      state.tradeExecution[action.payload.id].firstHop.allowanceApproval.isInitiallyRequired =
        action.payload?.firstHop
      state.tradeExecution[action.payload.id].secondHop.allowanceApproval.isInitiallyRequired =
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
      state.tradeExecution[action.payload.id].firstHop.allowanceReset.isInitiallyRequired =
        action.payload?.firstHop
      state.tradeExecution[action.payload.id].secondHop.allowanceReset.isInitiallyRequired =
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
    setAllowanceResetTxHash: (
      state,
      action: PayloadAction<{
        hopIndex: number
        txHash: string
        id: TradeQuote['id']
      }>,
    ) => {
      const { hopIndex, txHash, id } = action.payload
      const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      const allowanceKey = AllowanceKey.AllowanceReset
      state.tradeExecution[id][hopKey][allowanceKey].txHash = txHash
    },
    setAllowanceApprovalTxHash: (
      state,
      action: PayloadAction<{
        hopIndex: number
        txHash: string
        id: TradeQuote['id']
      }>,
    ) => {
      const { hopIndex, txHash, id } = action.payload
      const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      const allowanceKey = AllowanceKey.AllowanceApproval
      state.tradeExecution[id][hopKey][allowanceKey].txHash = txHash
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
      const { hopIndex, streamingSwapMetadata, id } = action.payload
      const key = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      // Break race condition updating streaming swap state after trade completes
      if (state.tradeExecution[id][key].swap.state === TransactionExecutionState.Complete) {
        return
      }
      state.tradeExecution[id][key].swap.streamingSwap = streamingSwapMetadata
    },
    setStreamingSwapMetaComplete: (
      state,
      action: PayloadAction<{
        hopIndex: number
        id: TradeQuote['id']
      }>,
    ) => {
      const { hopIndex, id } = action.payload
      const key = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
      const existingState = state.tradeExecution[id][key].swap.streamingSwap

      // not a streaming swap, or no metadata to update (e.g in the case of very small streams which
      // never have a streaming state reported by the api)
      if (!existingState) return

      state.tradeExecution[id][key].swap.streamingSwap = {
        ...existingState,
        attemptedSwapCount: existingState?.totalSwapCount ?? 0,
      }
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
