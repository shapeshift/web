import type { AccountId } from '@shapeshiftoss/caip'
import type { TransactionExecutionState } from '@shapeshiftoss/swapper'
import type { PartialRecord } from '@shapeshiftoss/types'
import type { InterpolationOptions } from 'node-polyglot'

import type { ApprovalExecutionMetadata } from '../tradeQuoteSlice/types'
import type { StopLossSubmissionState } from './constants'

// Trigger types for stop-loss orders
export type StopLossTriggerType = 'price' | 'percentage'

// Stop-loss order status
export type StopLossOrderStatus = 'pending' | 'active' | 'triggered' | 'executed' | 'cancelled' | 'failed'

export type StopLossTransactionMetadata = {
    state: TransactionExecutionState
    txHash?: string
    message?: string | [string, InterpolationOptions]
    orderId?: string
}

export type StopLossSubmissionMetadata = {
    state: StopLossSubmissionState
    allowanceReset: ApprovalExecutionMetadata
    allowanceApproval: ApprovalExecutionMetadata
    stopLossOrder: StopLossTransactionMetadata
}

export type StopLossOrderParams = {
    // Asset being protected
    sellAssetId: string
    // Amount of asset to protect
    sellAmountCryptoBaseUnit: string
    // Asset to sell for (usually USDC)
    buyAssetId: string
    // Trigger type: absolute price or percentage drop
    triggerType: StopLossTriggerType
    // Trigger value (price in USD or percentage as decimal)
    triggerValue: string
    // Current price at order creation
    entryPrice: string
    // Account ID for the order
    accountId: AccountId
    // Order validity duration (unix timestamp)
    validTo: number
}

export type StopLossActiveQuote = {
    params: StopLossOrderParams
    estimatedOutputCryptoBaseUnit: string
    currentPrice: string
}

export type StopLossOrder = {
    id: string
    params: StopLossOrderParams
    status: StopLossOrderStatus
    createdAt: number
    triggeredAt?: number
    executedAt?: number
    executionTxHash?: string
}

export type StopLossState = {
    // Currently being configured
    activeQuote: StopLossActiveQuote | undefined
    // Confirmed orders pending execution
    orders: Record<string, StopLossOrder>
    // Submission state for each order
    orderSubmission: PartialRecord<string, StopLossSubmissionMetadata>
}
