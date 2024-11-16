import type { InterpolationOptions } from 'node-polyglot'
import type { LimitOrderQuoteParams } from 'state/apis/limit-orders/limitOrderApi'
import type {
  LimitOrder,
  LimitOrderQuoteId,
  LimitOrderQuoteResponse,
} from 'state/apis/limit-orders/types'

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

export type LimitOrderActiveQuote = {
  params: LimitOrderQuoteParams & { validTo: number; buyAmountCryptoBaseUnit: string }
  response: LimitOrderQuoteResponse
}

export type LimitOrderState = {
  activeQuote: LimitOrderActiveQuote | undefined
  confirmedLimitOrder: Record<LimitOrderQuoteId, Omit<LimitOrder, 'signature'>>
  orderSubmission: Record<LimitOrderQuoteId, LimitOrderSubmissionMetadata>
}
