import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type {
  Order,
  OrderCreation,
  OrderQuoteResponse,
  QuoteId,
} from '@shapeshiftoss/types/dist/cowSwap'
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

export type LimitOrderCreationParams = LimitOrderQuoteParams & {
  validTo: number
  buyAmountCryptoBaseUnit: string
  accountId: AccountId
}

export type LimitOrderActiveQuote = {
  params: LimitOrderCreationParams
  response: OrderQuoteResponse
}

export type UnsignedOrderCreation = Omit<OrderCreation, 'signature'> &
  Partial<Pick<OrderCreation, 'signature'>>

export type LimitOrderState = {
  activeQuote: LimitOrderActiveQuote | undefined
  orderToCancel:
    | { accountId: AccountId; sellAssetId: AssetId; buyAssetId: AssetId; order: Order }
    | undefined
  confirmedLimitOrder: Record<
    QuoteId,
    { params: LimitOrderCreationParams; unsignedOrderCreation: UnsignedOrderCreation }
  >
  orderSubmission: Record<QuoteId, LimitOrderSubmissionMetadata>
}
