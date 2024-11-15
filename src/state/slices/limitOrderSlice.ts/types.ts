import type { InterpolationOptions } from 'node-polyglot'
import type { LimitOrderId, LimitOrderQuote } from 'state/apis/limit-orders/types'

import type { ApprovalExecutionMetadata, TransactionExecutionState } from '../tradeQuoteSlice/types'
import type { LimitOrderSubmissionState } from './constants'

export type LimitOrderTransactionMetadata = {
  state: TransactionExecutionState
  txHash?: string
  message?: string | [string, InterpolationOptions]
}

export type LimitOrderSubmissionMetadata = {
  state: LimitOrderSubmissionState
  allowanceReset: ApprovalExecutionMetadata
  allowanceApproval: ApprovalExecutionMetadata
  limitOrder: LimitOrderTransactionMetadata
}

export type LimitOrderState = {
  confirmedQuote: { id: LimitOrderId; quote: LimitOrderQuote } | undefined
  orderSubmission: Record<LimitOrderId, LimitOrderSubmissionMetadata>
}
