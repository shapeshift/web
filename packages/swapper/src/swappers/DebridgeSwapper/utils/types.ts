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
  orderId: string
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

export type DebridgeOrderIdsResponse = {
  orderIds: string[]
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
