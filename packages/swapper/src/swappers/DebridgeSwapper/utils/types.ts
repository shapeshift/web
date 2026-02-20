import type { Asset } from '@shapeshiftoss/types'

export type DebridgeTradeBaseParams = {
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  affiliateBps: string
}

export type DebridgeTradeInputParams<T extends 'rate' | 'quote'> = DebridgeTradeBaseParams & {
  quoteOrRate: T
  receiveAddress: T extends 'rate' ? string | undefined : string
  sendAddress: T extends 'rate' ? undefined : string
  accountNumber: T extends 'rate' ? undefined : number
  slippageTolerancePercentageDecimal?: string
}

export type DebridgeTransactionMetadata = {
  to: string
  data: string
  value: string
  gasLimit?: string
  orderId?: string
  isSameChainSwap?: boolean
}

export type DebridgeTokenInfo = {
  address: string
  chainId: number
  decimals: number
  name: string
  symbol: string
  amount: string
  approximateOperatingExpense?: string
  mutatedWithOperatingExpense?: boolean
  approximateUsdValue?: number
  maxRefundAmount?: string
}

export type DebridgeCostDetail = {
  type:
    | 'DlnProtocolFee'
    | 'TakerMargin'
    | 'EstimatedOperatingExpenses'
    | 'InputTokenFee'
    | 'OutputTokenFee'
  payload: {
    feeAmount: string
    feeBps?: string
    chain?: string
    tokenAddress?: string
  }
}

export type DebridgeEstimation = {
  srcChainTokenIn: DebridgeTokenInfo
  srcChainTokenOut?: DebridgeTokenInfo
  dstChainTokenOut: DebridgeTokenInfo & {
    recommendedAmount: string
  }
  costsDetails: DebridgeCostDetail[]
  recommendedSlippage: number
}

export type DebridgeTx = {
  to: string
  data: string
  value: string
}

export type DebridgeOrder = {
  approximateFulfillmentDelay: number
  salt: number
  metadata: string
}

export type DebridgeCreateTxResponse = {
  estimation: DebridgeEstimation
  tx: DebridgeTx
  orderId: string
  order: DebridgeOrder
  fixFee: string
  prependedOperatingExpenseCost?: string
  estimatedTransactionFee?: DebridgeSingleChainEstimatedTransactionFee
}

export type DebridgeOrderStatus = {
  orderId: string
  status:
    | 'None'
    | 'Created'
    | 'Fulfilled'
    | 'SentUnlock'
    | 'ClaimedUnlock'
    | 'OrderCancelled'
    | 'SentOrderCancel'
    | 'ClaimedOrderCancel'
}

export type DebridgeOrderId = {
  bytesValue: string
  bytesArrayValue: string
  stringValue: string
}

export type DebridgeOrderIdsResponse = {
  orderIds: DebridgeOrderId[]
}

export type DebridgeSingleChainTokenInfo = {
  address: string
  name: string
  symbol: string
  decimals: number
  amount: string
  approximateUsdValue?: number
}

export type DebridgeSingleChainTokenOut = DebridgeSingleChainTokenInfo & {
  minAmount: string
}

export type DebridgeSingleChainCostDetail = {
  chain: string
  tokenIn: string
  tokenOut: string
  amountIn: string
  amountOut: string
  type: string
  payload: {
    feeAmount?: string
    feeBps?: string
    amountOutBeforeCorrection?: string
    estimatedVolatilityBps?: string
    actualFeeAmount?: string
    actualFeeBps?: string
    subsidyAmount?: string
    feeApproximateUsdValue?: string
  }
}

export type DebridgeSingleChainEstimatedTransactionFee = {
  total: string
  details: {
    gasLimit: string
    baseFee?: string
    maxFeePerGas?: string
    maxPriorityFeePerGas?: string
  }
  approximateUsdValue?: number
}

export type DebridgeSingleChainTransactionResponse = {
  tokenIn: DebridgeSingleChainTokenInfo
  tokenOut: DebridgeSingleChainTokenOut
  slippage: number
  recommendedSlippage: number
  protocolFee?: string
  costsDetails: DebridgeSingleChainCostDetail[]
  estimatedTransactionFee?: DebridgeSingleChainEstimatedTransactionFee
  tx: {
    to: string
    data: string
    value: string
  }
}

export type DebridgeError = {
  errorCode?: number
  errorId?: string
  errorMessage?: string
  statusCode?: number
  message?: string
}

export const isDebridgeError = (error: unknown): error is DebridgeError => {
  return typeof error === 'object' && error !== null && ('errorCode' in error || 'message' in error)
}
