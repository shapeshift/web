import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { QuoteId } from '@shapeshiftoss/types'
import assert from 'assert'
import type { InterpolationOptions } from 'node-polyglot'

import { TransactionExecutionState } from '../tradeQuoteSlice/types'
import {
  initialState,
  limitOrderSubmissionInitialState,
  LimitOrderSubmissionState,
} from './constants'
import { buildUnsignedLimitOrder } from './helpers'
import type { LimitOrderActiveQuote, LimitOrderState, LimitOrderSubmissionMetadata } from './types'

// Create a type-safe immer draft that will populate the orderSubmission object if undefined
const makeOrderSubmissionDraft = (
  orderSubmission: LimitOrderState['orderSubmission'],
  id: QuoteId,
): LimitOrderSubmissionMetadata => {
  if (!orderSubmission[id]) {
    orderSubmission[id] = limitOrderSubmissionInitialState
  }
  return orderSubmission[id] as LimitOrderSubmissionMetadata
}

export const limitOrderSlice = createSlice({
  name: 'limitOrder',
  initialState,
  reducers: {
    clear: state => ({
      ...initialState,
      orderSubmission: state.orderSubmission, // Leave the limit order submission state alone
    }),
    setActiveQuote: (state, action: PayloadAction<LimitOrderActiveQuote | undefined>) => {
      if (action.payload === undefined) {
        state.activeQuote = undefined
        return
      }
      const quoteId = action.payload.response.id

      // The CoW api deems the ID as optional, but realistically is never undefined. This is here to
      // prevent bad things happening if this assumption EVER turns out to be false.
      if (!quoteId) {
        console.error('Missing quoteId')
        return
      }
      state.activeQuote = action.payload
      state.orderSubmission[quoteId] = limitOrderSubmissionInitialState
    },
    setLimitOrderInitialized: (state, action: PayloadAction<QuoteId>) => {
      const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, action.payload)
      draftOrderSubmission.state = LimitOrderSubmissionState.Previewing
    },
    confirmSubmit: (state, action: PayloadAction<QuoteId>) => {
      const limitOrderQuoteId = action.payload

      // If there is no active quote, the state is corrupt.
      // This should never actually happen because the view layer should prevent calling this when
      // the state isn't valid, but it's here to protect us from ourselves.
      if (state.activeQuote === undefined) {
        console.error('Attempted to confirm an non-existent limit order quote')
        return
      }

      // If this is not true, the state is corrupt.
      assert(state.activeQuote.response.id === limitOrderQuoteId)

      const unsignedOrderCreation = buildUnsignedLimitOrder(state.activeQuote)
      state.confirmedLimitOrder[limitOrderQuoteId] = {
        params: state.activeQuote.params,
        unsignedOrderCreation,
      }

      // This should never actually happen because the view layer should prevent calling this when
      // the state isn't valid, but it's here to protect us from ourselves.
      const draftOrderSubmission = makeOrderSubmissionDraft(
        state.orderSubmission,
        limitOrderQuoteId,
      )
      if (draftOrderSubmission.state !== LimitOrderSubmissionState.Previewing) {
        if (draftOrderSubmission.state === LimitOrderSubmissionState.Initializing) {
          console.error('Attempted to confirm an uninitialized limit order')
        } else {
          console.error('Attempted to confirm an in-progress limit order')
        }
        return
      }

      const allowanceResetRequired = draftOrderSubmission.allowanceReset.isRequired
      const approvalRequired = draftOrderSubmission.allowanceApproval.isInitiallyRequired

      switch (true) {
        case allowanceResetRequired:
          draftOrderSubmission.state = LimitOrderSubmissionState.AwaitingAllowanceReset
          break
        case approvalRequired:
          draftOrderSubmission.state = LimitOrderSubmissionState.AwaitingAllowanceApproval
          break
        default:
          draftOrderSubmission.state = LimitOrderSubmissionState.AwaitingLimitOrderSubmission
          break
      }
    },
    setAllowanceResetTxPending: (state, action: PayloadAction<QuoteId>) => {
      const id = action.payload
      const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, id)
      draftOrderSubmission.allowanceReset.state = TransactionExecutionState.Pending
    },
    setAllowanceApprovalTxPending: (state, action: PayloadAction<QuoteId>) => {
      const id = action.payload
      const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, id)
      draftOrderSubmission.allowanceApproval.state = TransactionExecutionState.Pending
    },
    setAllowanceResetTxFailed: (state, action: PayloadAction<QuoteId>) => {
      const id = action.payload
      const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, id)
      draftOrderSubmission.allowanceApproval.state = TransactionExecutionState.Failed
    },
    setAllowanceApprovalTxFailed: (state, action: PayloadAction<QuoteId>) => {
      const id = action.payload
      const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, id)
      draftOrderSubmission.allowanceApproval.state = TransactionExecutionState.Failed
    },
    setAllowanceResetTxComplete: (state, action: PayloadAction<QuoteId>) => {
      const id = action.payload
      const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, id)
      draftOrderSubmission.allowanceReset.state = TransactionExecutionState.Complete
    },
    // marks the approval tx as complete, but the allowance check needs to pass before proceeding to swap step
    setAllowanceApprovalTxComplete: (state, action: PayloadAction<QuoteId>) => {
      const id = action.payload
      const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, id)
      draftOrderSubmission.allowanceApproval.state = TransactionExecutionState.Complete
    },
    // This is deliberately disjoint to the allowance reset transaction orchestration to allow users to
    // complete an approval externally and have the app respond to the updated allowance on chain.
    setAllowanceResetStepComplete: (state, action: PayloadAction<QuoteId>) => {
      const id = action.payload

      const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, id)
      // Don't update the state if we're on a different stage of the flow
      if (draftOrderSubmission.state !== LimitOrderSubmissionState.AwaitingAllowanceReset) {
        return
      }

      draftOrderSubmission.state = LimitOrderSubmissionState.AwaitingAllowanceApproval
    },
    // This is deliberately disjoint to the allowance approval transaction orchestration to allow users to
    // complete an approval externally and have the app respond to the updated allowance on chain.
    setAllowanceApprovalStepComplete: (state, action: PayloadAction<QuoteId>) => {
      const id = action.payload

      const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, id)
      if (draftOrderSubmission.state !== LimitOrderSubmissionState.AwaitingAllowanceApproval) {
        return
      }

      draftOrderSubmission.state = LimitOrderSubmissionState.AwaitingLimitOrderSubmission
    },
    setLimitOrderTxPending: (state, action: PayloadAction<QuoteId>) => {
      const id = action.payload
      const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, id)
      draftOrderSubmission.limitOrder.state = TransactionExecutionState.Pending
    },
    setLimitOrderTxFailed: (state, action: PayloadAction<QuoteId>) => {
      const id = action.payload
      const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, id)
      draftOrderSubmission.limitOrder.state = TransactionExecutionState.Failed
    },
    setLimitOrderTxMessage: (
      state,
      action: PayloadAction<{
        id: QuoteId
        hopIndex: number
        message: string | [string, InterpolationOptions] | undefined
      }>,
    ) => {
      const { id, message } = action.payload
      const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, id)
      draftOrderSubmission.limitOrder.message = message
    },
    setLimitOrderTxComplete: (state, action: PayloadAction<QuoteId>) => {
      const id = action.payload

      const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, id)
      draftOrderSubmission.limitOrder.state = TransactionExecutionState.Complete
      draftOrderSubmission.limitOrder.message = undefined
      draftOrderSubmission.state = LimitOrderSubmissionState.Complete
    },
    setInitialApprovalRequirements: (
      state,
      action: PayloadAction<{ isAllowanceApprovalRequired: boolean | undefined; id: QuoteId }>,
    ) => {
      const draftOrderSubmission = makeOrderSubmissionDraft(
        state.orderSubmission,
        action.payload.id,
      )
      draftOrderSubmission.allowanceApproval.isRequired =
        action.payload?.isAllowanceApprovalRequired
      draftOrderSubmission.allowanceApproval.isInitiallyRequired =
        action.payload?.isAllowanceApprovalRequired
    },
    setAllowanceResetRequirements: (
      state,
      action: PayloadAction<{ isAllowanceResetRequired: boolean | undefined; id: QuoteId }>,
    ) => {
      const draftOrderSubmission = makeOrderSubmissionDraft(
        state.orderSubmission,
        action.payload.id,
      )
      draftOrderSubmission.allowanceReset.isRequired = action.payload?.isAllowanceResetRequired
      draftOrderSubmission.allowanceReset.isInitiallyRequired =
        action.payload?.isAllowanceResetRequired
    },
    setAllowanceResetTxHash: (
      state,
      action: PayloadAction<{
        txHash: string
        id: QuoteId
      }>,
    ) => {
      const { txHash, id } = action.payload
      const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, id)
      draftOrderSubmission.allowanceReset.txHash = txHash
    },
    setAllowanceApprovalTxHash: (
      state,
      action: PayloadAction<{
        txHash: string
        id: QuoteId
      }>,
    ) => {
      const { txHash, id } = action.payload
      const draftOrderSubmission = makeOrderSubmissionDraft(state.orderSubmission, id)
      draftOrderSubmission.allowanceApproval.txHash = txHash
    },
    setLimitOrderSubmissionTxHash: (
      state,
      action: PayloadAction<{ txHash: string; id: QuoteId }>,
    ) => {
      const { txHash } = action.payload
      const draftOrderSubmission = makeOrderSubmissionDraft(
        state.orderSubmission,
        action.payload.id,
      )
      draftOrderSubmission.limitOrder.txHash = txHash
    },
  },
})
