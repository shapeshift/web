import type { OrderCreation, OrderQuoteResponse, QuoteId } from '@shapeshiftoss/types/dist/cowSwap'
import type { InterpolationOptions } from 'node-polyglot'
import type { LimitOrderQuoteParams } from 'state/apis/limit-orders/limitOrderApi'

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
  response: OrderQuoteResponse
}

export type LimitOrderState = {
  activeQuote: LimitOrderActiveQuote | undefined
  confirmedLimitOrder: Record<
    QuoteId,
    Omit<OrderCreation, 'signature'> & Partial<Pick<OrderCreation, 'signature'>>
  >
  orderSubmission: Record<QuoteId, LimitOrderSubmissionMetadata>
}
