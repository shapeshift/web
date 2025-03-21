import type { AccountId } from '@shapeshiftoss/caip'
import type {
  OrderQuoteResponse,
  PartialRecord,
  QuoteId,
  UnsignedOrderCreation,
} from '@shapeshiftoss/types'
import type { InterpolationOptions } from 'node-polyglot'

import type { ApprovalExecutionMetadata, TransactionExecutionState } from '../tradeQuoteSlice/types'
import type { LimitOrderSubmissionState } from './constants'

import type { LimitOrderQuoteParams } from '@/state/apis/limit-orders/limitOrderApi'

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

export type LimitOrderCreationParams = LimitOrderQuoteParams & {
  validTo: number
  buyAmountCryptoBaseUnit: string
  accountId: AccountId
}

export type LimitOrderActiveQuote = {
  params: LimitOrderCreationParams
  response: OrderQuoteResponse
}

export type LimitOrderState = {
  activeQuote: LimitOrderActiveQuote | undefined
  confirmedLimitOrder: Record<
    QuoteId,
    { params: LimitOrderCreationParams; unsignedOrderCreation: UnsignedOrderCreation }
  >
  orderSubmission: PartialRecord<QuoteId, LimitOrderSubmissionMetadata>
}
