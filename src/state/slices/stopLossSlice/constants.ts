import {
    initialApprovalExecutionState,
    initialTransactionState,
} from '../tradeQuoteSlice/constants'
import type { StopLossState } from './types'

export enum StopLossSubmissionState {
    Initializing = 'Initializing',
    Previewing = 'Previewing',
    AwaitingAllowanceReset = 'AwaitingAllowanceReset',
    AwaitingAllowanceApproval = 'AwaitingAllowanceApproval',
    AwaitingStopLossSubmission = 'AwaitingStopLossSubmission',
    Complete = 'Complete',
}

export const stopLossSubmissionInitialState = {
    state: StopLossSubmissionState.Initializing,
    allowanceReset: initialApprovalExecutionState,
    allowanceApproval: initialApprovalExecutionState,
    stopLossOrder: initialTransactionState,
}

export const initialState: StopLossState = {
    activeQuote: undefined,
    orders: {},
    orderSubmission: {},
}
