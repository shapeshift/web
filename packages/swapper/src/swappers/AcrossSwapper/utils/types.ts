import type { Asset } from '@shapeshiftoss/types'

export type AcrossTradeBaseParams = {
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  affiliateBps: string
}

export type AcrossTradeInputParams<T extends 'rate' | 'quote'> = AcrossTradeBaseParams & {
  quoteOrRate: T
  receiveAddress: T extends 'rate' ? string | undefined : string
  sendAddress: T extends 'rate' ? undefined : string
  accountNumber: T extends 'rate' ? undefined : number
  slippageTolerancePercentageDecimal?: string
}

export type AcrossTransactionMetadata = {
  to: string
  data: string
  value: string
  gasLimit?: string
  ecosystem: 'evm' | 'svm'
  quoteId: string
}

export type AcrossTokenInfo = {
  address: string
  decimals: number
  symbol: string
  name: string
  chainId: number
}

export type AcrossSwapStep = {
  tokenIn: AcrossTokenInfo
  tokenOut: AcrossTokenInfo
  inputAmount: string
  outputAmount: string
  minOutputAmount: string
  maxInputAmount: string
  swapProvider: { name: string; sources: string[] }
  slippage: number
}

export type AcrossFeePart = {
  amount: string
  pct: string
  token: AcrossTokenInfo
}

export type AcrossBridgeFeeDetails = {
  type: 'across'
  relayerCapital: AcrossFeePart
  destinationGas: AcrossFeePart
  lp: AcrossFeePart
}

export type AcrossBridgeStep = {
  inputAmount: string
  outputAmount: string
  tokenIn: AcrossTokenInfo
  tokenOut: AcrossTokenInfo
  fees: {
    amount: string
    pct: string
    token: AcrossTokenInfo
    details: AcrossBridgeFeeDetails
  }
  provider: string
}

export type AcrossFeeBreakdown = {
  amount: string
  amountUsd: string
  token: AcrossTokenInfo
  pct: string
  details: {
    type: string
    swapImpact: { amount: string; amountUsd: string; token: AcrossTokenInfo; pct: string }
    app: { amount: string; amountUsd: string; pct: string; token: AcrossTokenInfo }
    bridge: AcrossBridgeStep['fees']
  }
}

export type AcrossSwapTx = {
  simulationSuccess: boolean
  chainId: number
  to: string
  data: string
  value?: string
  gas?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  ecosystem: 'evm' | 'svm'
}

export type AcrossSwapApprovalResponse = {
  crossSwapType:
    | 'bridgeableToBridgeable'
    | 'bridgeableToBridgeableIndirect'
    | 'bridgeableToAny'
    | 'anyToBridgeable'
    | 'anyToAny'
  amountType: string

  approvalTxns: {
    chainId: number
    to: string
    data: string
  }[]

  swapTx: AcrossSwapTx

  checks: {
    allowance: { token: string; spender: string; actual: string; expected: string }
    balance: { token: string; actual: string; expected: string }
  }

  steps: {
    originSwap?: AcrossSwapStep
    bridge: AcrossBridgeStep
    destinationSwap?: AcrossSwapStep
  }

  inputToken: AcrossTokenInfo
  outputToken: AcrossTokenInfo
  refundToken: AcrossTokenInfo

  inputAmount: string
  maxInputAmount: string
  expectedOutputAmount: string
  minOutputAmount: string

  fees: {
    total: AcrossFeeBreakdown
    totalMax: AcrossFeeBreakdown
    originGas: { amount: string; amountUsd: string; token: AcrossTokenInfo }
  }

  expectedFillTime: number
  quoteExpiryTimestamp: number
  id: string
}

export type AcrossDepositStatus = {
  status: 'filled' | 'pending' | 'expired' | 'refunded' | 'slowFillRequested'
  fillTxnRef?: string
  destinationChainId: number
  originChainId: number
  depositId: number
  depositTxnRef: string
  depositRefundTxnRef?: string
  actionsSucceeded?: boolean
  pagination: { currentIndex: number; maxIndex: number }
}

export type AcrossError = {
  type: string
  code: string
  status: number
  message: string
  id: string
}

export const isAcrossError = (error: unknown): error is AcrossError => {
  return typeof error === 'object' && error !== null && 'code' in error && 'status' in error
}

export enum AcrossErrorCode {
  InvalidParam = 'INVALID_PARAM',
  AmountTooLow = 'AMOUNT_TOO_LOW',
  RouteNotFound = 'ROUTE_NOT_FOUND',
  NoBridgeRoutes = 'NO_BRIDGE_ROUTES',
  UnsupportedToken = 'UNSUPPORTED_TOKEN',
  InsufficientLiquidity = 'INSUFFICIENT_LIQUIDITY',
  InternalError = 'INTERNAL_ERROR',
}
