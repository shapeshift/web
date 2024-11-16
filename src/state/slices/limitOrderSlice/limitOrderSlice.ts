import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import assert from 'assert'
import type { InterpolationOptions } from 'node-polyglot'
import type { LimitOrderQuoteId } from 'state/apis/limit-orders/types'

import { TransactionExecutionState } from '../tradeQuoteSlice/types'
import {
  initialState,
  limitOrderSubmissionInitialState,
  LimitOrderSubmissionState,
} from './constants'
import { buildUnsignedLimitOrder } from './helpers'
import type { LimitOrderActiveQuote } from './types'

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
      state.activeQuote = action.payload
      state.orderSubmission[action.payload.response.id] = limitOrderSubmissionInitialState
    },
    confirmSubmit: (state, action: PayloadAction<LimitOrderQuoteId>) => {
      const limitOrderQuoteId = action.payload

      // If there is no active quote, the state is corrupt.
      if (state.activeQuote === undefined) {
        console.error('attempted to confirm an non-existed limit order quote')
        return
      }

      // If this is not true, the state is corrupt.
      assert(state.activeQuote.response.id === limitOrderQuoteId)

      const limitOrder = buildUnsignedLimitOrder(state.activeQuote)
      state.confirmedLimitOrder[limitOrderQuoteId] = limitOrder

      if (state.orderSubmission[limitOrderQuoteId].state !== LimitOrderSubmissionState.Previewing) {
        if (
          state.orderSubmission[limitOrderQuoteId].state === LimitOrderSubmissionState.Initializing
        ) {
          console.error('attempted to confirm an uninitialized limit order')
        } else {
          console.error('attempted to confirm an in-progress limit order')
        }
        return
      }

      const allowanceResetRequired =
        state.orderSubmission[limitOrderQuoteId].allowanceReset.isRequired
      const approvalRequired =
        state.orderSubmission[limitOrderQuoteId].allowanceApproval.isInitiallyRequired

      switch (true) {
        case allowanceResetRequired:
          state.orderSubmission[limitOrderQuoteId].state =
            LimitOrderSubmissionState.AwaitingAllowanceReset
          break
        case approvalRequired:
          state.orderSubmission[limitOrderQuoteId].state =
            LimitOrderSubmissionState.AwaitingAllowanceApproval
          break
        default:
          state.orderSubmission[limitOrderQuoteId].state =
            LimitOrderSubmissionState.AwaitingLimitOrderSubmission
          break
      }
    },
    setAllowanceResetTxPending: (state, action: PayloadAction<LimitOrderQuoteId>) => {
      const id = action.payload
      state.orderSubmission[id].allowanceReset.state = TransactionExecutionState.Pending
    },
    setAllowanceApprovalTxPending: (state, action: PayloadAction<LimitOrderQuoteId>) => {
      const id = action.payload
      state.orderSubmission[id].allowanceApproval.state = TransactionExecutionState.Pending
    },
    setAllowanceResetTxFailed: (state, action: PayloadAction<LimitOrderQuoteId>) => {
      const id = action.payload
      state.orderSubmission[id].allowanceApproval.state = TransactionExecutionState.Failed
    },
    setAllowanceApprovalTxFailed: (state, action: PayloadAction<LimitOrderQuoteId>) => {
      const id = action.payload
      state.orderSubmission[id].allowanceApproval.state = TransactionExecutionState.Failed
    },
    setAllowanceResetTxComplete: (state, action: PayloadAction<LimitOrderQuoteId>) => {
      const id = action.payload
      state.orderSubmission[id].allowanceReset.state = TransactionExecutionState.Complete
    },
    // marks the approval tx as complete, but the allowance check needs to pass before proceeding to swap step
    setAllowanceApprovalTxComplete: (state, action: PayloadAction<LimitOrderQuoteId>) => {
      const id = action.payload
      state.orderSubmission[id].allowanceApproval.state = TransactionExecutionState.Complete
    },
    // This is deliberately disjoint to the allowance reset transaction orchestration to allow users to
    // complete an approval externally and have the app respond to the updated allowance on chain.
    setAllowanceResetStepComplete: (state, action: PayloadAction<LimitOrderQuoteId>) => {
      const id = action.payload

      // Don't update the state if we're on a different stage of the flow
      if (state.orderSubmission[id].state !== LimitOrderSubmissionState.AwaitingAllowanceReset) {
        return
      }

      state.orderSubmission[id].state = LimitOrderSubmissionState.AwaitingAllowanceApproval
    },
    // This is deliberately disjoint to the allowance approval transaction orchestration to allow users to
    // complete an approval externally and have the app respond to the updated allowance on chain.
    setAllowanceApprovalStepComplete: (state, action: PayloadAction<LimitOrderQuoteId>) => {
      const id = action.payload

      // Don't update the state if we're on a different stage of the flow
      if (state.orderSubmission[id].state !== LimitOrderSubmissionState.AwaitingAllowanceApproval) {
        return
      }

      state.orderSubmission[id].state = LimitOrderSubmissionState.AwaitingLimitOrderSubmission
    },
    setLimitOrderTxPending: (state, action: PayloadAction<LimitOrderQuoteId>) => {
      const id = action.payload
      state.orderSubmission[id].limitOrder.state = TransactionExecutionState.Pending
    },
    setLimitOrderTxFailed: (state, action: PayloadAction<LimitOrderQuoteId>) => {
      const id = action.payload
      state.orderSubmission[id].limitOrder.state = TransactionExecutionState.Failed
    },
    setLimitOrderTxMessage: (
      state,
      action: PayloadAction<{
        id: LimitOrderQuoteId
        hopIndex: number
        message: string | [string, InterpolationOptions] | undefined
      }>,
    ) => {
      const { id, message } = action.payload
      state.orderSubmission[id].limitOrder.message = message
    },
    setLimitOrderTxComplete: (state, action: PayloadAction<LimitOrderQuoteId>) => {
      const id = action.payload

      state.orderSubmission[id].limitOrder.state = TransactionExecutionState.Complete
      state.orderSubmission[id].limitOrder.message = undefined
      state.orderSubmission[id].state = LimitOrderSubmissionState.Complete
    },
    setInitialApprovalRequirements: (
      state,
      action: PayloadAction<{ isAllowanceApprovalRequired: boolean; id: LimitOrderQuoteId }>,
    ) => {
      state.orderSubmission[action.payload.id].allowanceApproval.isRequired =
        action.payload?.isAllowanceApprovalRequired
      state.orderSubmission[action.payload.id].allowanceApproval.isInitiallyRequired =
        action.payload?.isAllowanceApprovalRequired
    },
    setAllowanceResetRequirements: (
      state,
      action: PayloadAction<{ isAllowanceResetRequired: boolean; id: LimitOrderQuoteId }>,
    ) => {
      state.orderSubmission[action.payload.id].allowanceReset.isRequired =
        action.payload?.isAllowanceResetRequired
      state.orderSubmission[action.payload.id].allowanceReset.isInitiallyRequired =
        action.payload?.isAllowanceResetRequired
    },
    setAllowanceResetTxHash: (
      state,
      action: PayloadAction<{
        txHash: string
        id: LimitOrderQuoteId
      }>,
    ) => {
      const { txHash, id } = action.payload
      state.orderSubmission[id].allowanceReset.txHash = txHash
    },
    setAllowanceApprovalTxHash: (
      state,
      action: PayloadAction<{
        txHash: string
        id: LimitOrderQuoteId
      }>,
    ) => {
      const { txHash, id } = action.payload
      state.orderSubmission[id].allowanceApproval.txHash = txHash
    },
    setLimitOrderSubmissionTxHash: (
      state,
      action: PayloadAction<{ txHash: string; id: LimitOrderQuoteId }>,
    ) => {
      const { txHash } = action.payload
      state.orderSubmission[action.payload.id].limitOrder.txHash = txHash
    },
  },
})
