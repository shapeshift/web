import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { SwapperName, TradeQuote, TradeRate } from '@shapeshiftoss/swapper'
import { TransactionExecutionState } from '@shapeshiftoss/swapper'
import { uniqBy } from 'lodash'
import type { InterpolationOptions } from 'node-polyglot'

import { initialState } from './constants'
import { createInitialTradeExecutionState } from './helpers'
import type { HopProgress, QuoteSortOption, TradeExecutionMetadata } from './types'
import { AllowanceKey, HopExecutionState, HopKey, TradeExecutionState } from './types'

import type { ApiQuote } from '@/state/apis/swapper/types'

export const tradeQuoteSlice = createSlice({
  name: 'tradeQuote',
  initialState,
  reducers: create => ({
    clear: create.reducer(state => ({
      ...initialState,
      tradeExecution: state.tradeExecution, // Leave the trade execution state alone
      sortOption: state.sortOption, // Preserve the sort option
    })),
    clearTradeQuotes: create.reducer(state => ({
      ...initialState,
      tradeExecution: state.tradeExecution, // Leave the trade execution state alone
      activeQuoteMeta: state.activeQuoteMeta, // And the activeQuoteMeta too, or we'll lose the active quote when backing out from preview
      sortOption: state.sortOption, // Preserve the sort option
    })),
    setIsTradeQuoteRequestAborted: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isTradeQuoteRequestAborted = action.payload
    }),
    upsertTradeQuote: create.reducer(
      (
        state,
        action: PayloadAction<{
          swapperName: SwapperName
          quotesById: Record<string, ApiQuote> | undefined
        }>,
      ) => {
        const { swapperName, quotesById } = action.payload
        state.tradeQuotes[swapperName] = quotesById ?? {}
      },
    ),
    upsertTradeQuotes: create.reducer(
      (state, action: PayloadAction<Record<SwapperName, Record<string, ApiQuote>>>) => {
        Object.entries(action.payload).forEach(([swapperName, quotesById]) => {
          state.tradeQuotes[swapperName as SwapperName] = quotesById ?? {}
        })
      },
    ),
    setActiveQuote: create.reducer((state, action: PayloadAction<ApiQuote | undefined>) => {
      if (action.payload === undefined) {
        state.activeQuoteMeta = undefined
      } else {
        const { swapperName, id } = action.payload
        state.activeQuoteMeta = {
          swapperName,
          identifier: id,
        }
      }
    }),
    setConfirmedQuote: create.reducer((state, action: PayloadAction<TradeQuote | TradeRate>) => {
      state.confirmedQuote = action.payload
    }),
    clearQuoteExecutionState: create.reducer((state, action: PayloadAction<TradeQuote['id']>) => {
      state.tradeExecution[action.payload] = createInitialTradeExecutionState()
    }),
    initializeQuickBuyTrade: create.reducer(
      (state, action: PayloadAction<TradeQuote | TradeRate>) => {
        const quote = action.payload
        state.confirmedQuote = quote
        state.tradeExecution[quote.id] = createInitialTradeExecutionState()
        state.tradeExecution[quote.id].state = TradeExecutionState.Previewing
      },
    ),
    setTradeExecutionMetadata: create.reducer(
      (
        state,
        action: PayloadAction<{ id: TradeQuote['id']; executionMetadata: TradeExecutionMetadata }>,
      ) => {
        state.tradeExecution[action.payload.id] = action.payload.executionMetadata
      },
    ),
    setTradeInitialized: create.reducer((state, action: PayloadAction<TradeQuote['id']>) => {
      state.tradeExecution[action.payload].state = TradeExecutionState.Previewing
    }),
    confirmTrade: create.reducer((state, action: PayloadAction<TradeQuote['id']>) => {
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
          state.tradeExecution[tradeQuoteId].firstHop.state =
            HopExecutionState.AwaitingPermit2Eip712Sign
          break
        default:
          state.tradeExecution[tradeQuoteId].firstHop.state = HopExecutionState.AwaitingSwap
          break
      }
    }),
    setAllowanceResetTxPending: create.reducer(
      (state, action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>) => {
        const { hopIndex, id } = action.payload
        const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
        const allowanceKey = AllowanceKey.AllowanceReset
        state.tradeExecution[id][hopKey][allowanceKey].state = TransactionExecutionState.Pending
      },
    ),
    setAllowanceApprovalTxPending: create.reducer(
      (state, action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>) => {
        const { hopIndex, id } = action.payload
        const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
        const allowanceKey = AllowanceKey.AllowanceApproval
        state.tradeExecution[id][hopKey][allowanceKey].state = TransactionExecutionState.Pending
      },
    ),
    setPermit2SignaturePending: create.reducer(
      (state, action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>) => {
        const { hopIndex, id } = action.payload
        const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
        state.tradeExecution[id][hopKey].permit2.state = TransactionExecutionState.Pending
      },
    ),
    setAllowanceResetTxFailed: create.reducer(
      (state, action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>) => {
        const { hopIndex, id } = action.payload
        const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
        const allowanceKey = AllowanceKey.AllowanceApproval
        state.tradeExecution[id][hopKey][allowanceKey].state = TransactionExecutionState.Failed
      },
    ),
    setAllowanceApprovalTxFailed: create.reducer(
      (state, action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>) => {
        const { hopIndex, id } = action.payload
        const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
        const allowanceKey = AllowanceKey.AllowanceApproval
        state.tradeExecution[id][hopKey][allowanceKey].state = TransactionExecutionState.Failed
      },
    ),
    setPermit2SignatureFailed: create.reducer(
      (state, action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>) => {
        const { hopIndex, id } = action.payload
        const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
        state.tradeExecution[id][hopKey].permit2.state = TransactionExecutionState.Failed
      },
    ),
    setAllowanceResetTxComplete: create.reducer(
      (state, action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>) => {
        const { hopIndex, id } = action.payload
        const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
        const allowanceKey = AllowanceKey.AllowanceReset
        state.tradeExecution[id][hopKey][allowanceKey].state = TransactionExecutionState.Complete
      },
    ),
    // marks the approval tx as complete, but the allowance check needs to pass before proceeding to swap step
    setAllowanceApprovalTxComplete: create.reducer(
      (state, action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>) => {
        const { hopIndex, id } = action.payload
        const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
        const allowanceKey = AllowanceKey.AllowanceApproval
        state.tradeExecution[id][hopKey][allowanceKey].state = TransactionExecutionState.Complete
      },
    ),
    setPermit2SignatureComplete: create.reducer(
      (
        state,
        action: PayloadAction<{ hopIndex: number; id: TradeQuote['id']; permit2Signature: string }>,
      ) => {
        const { hopIndex, id, permit2Signature } = action.payload
        const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
        state.tradeExecution[id][hopKey].permit2.state = TransactionExecutionState.Complete
        state.tradeExecution[id][hopKey].permit2.permit2Signature = permit2Signature

        // Mark the allowance approval as complete since Permit2 replaces traditional allowance approval
        state.tradeExecution[id][hopKey].allowanceApproval.state =
          TransactionExecutionState.Complete

        // Mark the whole Permit2 step complete. We can do this here because no on-chain processing is
        // required, unlike allowance reset and allowance approval.
        state.tradeExecution[id][hopKey].state = HopExecutionState.AwaitingSwap
      },
    ),
    // This is deliberately disjoint to the allowance reset transaction orchestration to allow users to
    // complete an approval externally and have the app respond to the updated allowance on chain.
    setAllowanceResetStepComplete: create.reducer(
      (state, action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>) => {
        const { hopIndex, id } = action.payload
        const key = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop

        // Don't update the state if we're on a different stage of the flow
        if (state.tradeExecution[id][key].state !== HopExecutionState.AwaitingAllowanceReset) {
          return
        }

        state.tradeExecution[id][key].state = HopExecutionState.AwaitingAllowanceApproval
      },
    ),
    // This is deliberately disjoint to the allowance approval transaction orchestration to allow users to
    // complete an approval externally and have the app respond to the updated allowance on chain.
    setAllowanceApprovalStepComplete: create.reducer(
      (state, action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>) => {
        const { hopIndex, id } = action.payload
        const key = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop

        // Don't update the state if we're on a different stage of the flow
        if (state.tradeExecution[id][key].state !== HopExecutionState.AwaitingAllowanceApproval) {
          return
        }

        const permit2Required = state.tradeExecution[id][key].permit2.isRequired
        state.tradeExecution[id][key].state = permit2Required
          ? HopExecutionState.AwaitingPermit2Eip712Sign
          : HopExecutionState.AwaitingSwap
      },
    ),
    setSwapTxPending: create.reducer(
      (state, action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>) => {
        const { hopIndex } = action.payload
        const key = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
        state.tradeExecution[action.payload.id][key].swap.state = TransactionExecutionState.Pending
      },
    ),
    setSwapTxFailed: create.reducer(
      (state, action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>) => {
        const { hopIndex } = action.payload
        const key = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
        state.tradeExecution[action.payload.id][key].swap.state = TransactionExecutionState.Failed
      },
    ),

    setSwapTxMessage: create.reducer(
      (
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
    ),
    setSwapTxComplete: create.reducer(
      (state, action: PayloadAction<{ hopIndex: number; id: TradeQuote['id'] }>) => {
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
    ),
    setInitialApprovalRequirements: create.reducer(
      (
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
    ),
    setAllowanceResetRequirements: create.reducer(
      (
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
    ),
    setPermit2Requirements: create.reducer(
      (
        state,
        action: PayloadAction<{ firstHop: boolean; secondHop: boolean; id: TradeQuote['id'] }>,
      ) => {
        state.tradeExecution[action.payload.id].firstHop.permit2.isRequired =
          action.payload?.firstHop
        state.tradeExecution[action.payload.id].secondHop.permit2.isRequired =
          action.payload?.secondHop
      },
    ),
    setAllowanceResetTxHash: create.reducer(
      (
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
    ),
    setAllowanceApprovalTxHash: create.reducer(
      (
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
    ),
    setSwapSellTxHash: create.reducer(
      (
        state,
        action: PayloadAction<{ hopIndex: number; sellTxHash: string; id: TradeQuote['id'] }>,
      ) => {
        const { hopIndex, sellTxHash } = action.payload
        const key = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
        state.tradeExecution[action.payload.id][key].swap.sellTxHash = sellTxHash
      },
    ),
    setSwapRelayerTxDetails: create.reducer(
      (
        state,
        action: PayloadAction<{
          hopIndex: number
          relayerTxHash: string
          relayerExplorerTxLink: string
          id: TradeQuote['id']
        }>,
      ) => {
        const { hopIndex, relayerTxHash, relayerExplorerTxLink } = action.payload
        const key = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
        state.tradeExecution[action.payload.id][key].swap.relayerTxHash = relayerTxHash
        state.tradeExecution[action.payload.id][key].swap.relayerExplorerTxLink =
          relayerExplorerTxLink
      },
    ),
    setSwapBuyTxHash: create.reducer(
      (
        state,
        action: PayloadAction<{ hopIndex: number; buyTxHash: string; id: TradeQuote['id'] }>,
      ) => {
        const { hopIndex, buyTxHash } = action.payload
        const key = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop
        state.tradeExecution[action.payload.id][key].swap.buyTxHash = buyTxHash
      },
    ),
    updateTradeQuoteDisplayCache: create.reducer(
      (
        state,
        action: PayloadAction<{
          isTradeQuoteApiQueryPending: Partial<Record<SwapperName, boolean>>
          isSwapperQuoteAvailable: Record<SwapperName, boolean>
          sortedQuotes: ApiQuote[]
        }>,
      ) => {
        const { isTradeQuoteApiQueryPending, isSwapperQuoteAvailable, sortedQuotes } =
          action.payload

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

        // Don't use the original index from sortedQuotes, as they might be sorted with a different option
        const sortedQuotesWithoutOriginalIndex = sortedQuotes.map(quoteData => {
          return Object.assign({}, quoteData, { isStale: false })
        })

        const allQuotes = uniqBy(sortedQuotesWithoutOriginalIndex.concat(staleQuotes), 'id')

        // Keep all quotes in their sorted order, regardless of errors
        state.tradeQuoteDisplayCache = allQuotes
      },
    ),
    setHopProgress: create.reducer(
      (
        state,
        action: PayloadAction<{
          hopIndex: number
          tradeId: string
          progress: number
          status: HopProgress['status']
        }>,
      ) => {
        const { hopIndex, tradeId, progress, status } = action.payload
        const hopKey = hopIndex === 0 ? HopKey.FirstHop : HopKey.SecondHop

        if (!state.tradeExecution[tradeId]) return

        state.tradeExecution[tradeId][hopKey].progress = {
          progress,
          status,
        }
      },
    ),
    setSortOption: create.reducer((state, action: PayloadAction<QuoteSortOption>) => {
      state.sortOption = action.payload
    }),
  }),
  selectors: {
    selectQuoteSortOption: state => state.sortOption,
  },
})
