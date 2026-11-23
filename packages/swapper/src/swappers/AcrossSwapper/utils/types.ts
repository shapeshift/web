import type { GetEvmTradeQuoteInput, GetEvmTradeRateInput } from '../../../types'

export type AcrossTradeQuoteInput = GetEvmTradeQuoteInput
export type AcrossTradeRateInput = GetEvmTradeRateInput

type AcrossTokenRef = {
  chainId: number
  address: string
}

export type AcrossQuoteRequest = {
  origin: { token: AcrossTokenRef; amount: string; depositor: string }
  destination: { token: AcrossTokenRef; recipient: string }
  amountType: 'exact_input'
  authorizationPolicy: { allowedTypes: ['approval'] }
  appFeeBps?: number
}

type AcrossToken = AcrossTokenRef & {
  kind: 'token' | 'native'
  symbol: string
  decimals: number
}

type AcrossFeeAmount = {
  amount?: string
  amountUsd?: string
  token: AcrossToken
}

export type AcrossApprovalAction = {
  kind: 'approve_token'
  id: 'approval' | 'approval-reset'
  chainId: number
  tokenAddress: string
  spender: string
  amount: string
}

export type AcrossTransactionAction = {
  kind: 'send_transaction'
  id: 'prefunded-store' | 'swap-execute'
  ecosystem?: 'evm' | 'solana' | 'tron'
  chainId: number
  to: string
  data: string
  value: string
}

type AcrossOtherAction = {
  kind: 'sign_typed_data' | 'sign_transaction' | 'submit_execution'
  id: string
}

export type AcrossNextAction = AcrossApprovalAction | AcrossTransactionAction | AcrossOtherAction

export type AcrossGasEstimate = {
  leg: 'origin' | 'destination'
  effect: 'included_in_transfer_fee' | 'paid_by_wallet'
  actionId?: string
  amount: string
  gasUnits?: string
}

export type AcrossQuote = {
  orderId: string
  expiresAt: string
  originValidUntil: string
  expectedFillTimeMs: number
  origin: { token: AcrossToken; amount: string }
  destination: { token: AcrossToken; amount: string; minAmount: string; grossAmount?: string }
  fee: {
    totalFee: AcrossFeeAmount
    transferFee: AcrossFeeAmount
    appFee: AcrossFeeAmount
    maxTotalFee: AcrossFeeAmount
    maxTransferFee: AcrossFeeAmount
  }
  gasEstimates?: AcrossGasEstimate[]
  nextActions: AcrossNextAction[]
}

type AcrossTransferState = 'pending' | 'completed' | 'refunded' | 'failed'

export type AcrossTransfer = {
  orderId: string
  status: {
    state: AcrossTransferState
    reason: string
    description: string
    isTerminal: boolean
  }
  transactions: {
    type: 'deposit' | 'fill' | 'refund' | 'intermediate'
    transaction: { txnRef?: string | null; explorerUrl?: string | null }
  }[]
}

export type AcrossTransfersResponse = {
  transfers: AcrossTransfer[]
}

export type AcrossApiError = {
  code: string
  message: string
  param?: string
  details?: { amountLimits?: { side: 'min' | 'max' } }
}

// The API wraps errors in `error`, the gateway (401/429) returns them flat
export const getAcrossApiError = (data: unknown): AcrossApiError | undefined => {
  if (typeof data !== 'object' || data === null) return

  const error = 'error' in data ? data.error : data
  if (typeof error !== 'object' || error === null) return
  if (!('code' in error) || typeof error.code !== 'string') return

  return error as AcrossApiError
}
