import {
  initialApprovalExecutionState,
  initialTransactionState,
} from '../tradeQuoteSlice/constants'
import type { LimitOrderState } from './types'

export enum LimitOrderSubmissionState {
  Initializing = 'Initializing',
  Previewing = 'Previewing',
  AwaitingAllowanceReset = 'AwaitingAllowanceReset',
  AwaitingAllowanceApproval = 'AwaitingAllowanceApproval',
  AwaitingLimitOrderSubmission = 'AwaitingLimitOrderSubmission',
  Complete = 'Complete',
}

export const limitOrderSubmissionInitialState = {
  state: LimitOrderSubmissionState.Initializing,
  allowanceReset: initialApprovalExecutionState,
  allowanceApproval: initialApprovalExecutionState,
  limitOrder: initialTransactionState,
}

export const initialState: LimitOrderState = {
  activeQuote: undefined,
  orderSubmission: {},
}
