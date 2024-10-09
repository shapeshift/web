import type { AssetReference, ChainId } from '@shapeshiftoss/caip'
import type {
  CoWSwapBuyTokenDestination,
  CoWSwapOrderKind,
  CoWSwapSellTokenSource,
  CoWSwapSigningScheme,
} from '@shapeshiftoss/swapper'

export type LimitOrder = string
export type LimitOrderRequest = {
  sellToken: AssetReference
  buyToken: AssetReference
  receiver: string
  sellAmount: string
  buyAmount: string
  validTo: number
  feeAmount: string
  kind: CoWSwapOrderKind
  partiallyFillable: boolean
  sellTokenBalance: CoWSwapSellTokenSource
  buyTokenBalance: CoWSwapBuyTokenDestination
  signingScheme: CoWSwapSigningScheme
  signature: string
  from: string
  quoteId: number
  appData: string
  appDataHash: string
  chainId: ChainId
}

export type CancelLimitOrdersRequest = {
  orderUids: string[]
  signature: string
  signingScheme: CoWSwapSigningScheme
  chainId: ChainId
}

export type OrderExecutionStatus =
  | 'open'
  | 'scheduled'
  | 'active'
  | 'solved'
  | 'executing'
  | 'traded'
  | 'cancelled'

type ExecutedAmounts = {
  sell: string
  buy: string
}

export type OrderExecution = {
  solver: string
  executedAmounts: ExecutedAmounts
}

export type OrderStatusResponse = {
  type: OrderExecutionStatus
  value: OrderExecution[]
}

type ProtocolFee = {
  policy: {
    factor: number
    maxVolumeFactor: number
  }
  amount: string
  token: string
}

export type GetOrdersRequest = {
  owner: string
  chainId: ChainId
  offset?: number
  limit?: number
}

export type Trade = {
  blockNumber: number
  logIndex: number
  orderUid: string
  owner: string
  sellToken: string
  buyToken: string
  sellAmount: string
  sellAmountBeforeFees: string
  buyAmount: string
  txHash: string
  executedProtocolFees: ProtocolFee[]
}

type EthflowData = {
  refundTxHash: string
  userValidTo: number
}

enum PlacementError {
  QuoteNotFound = 'QuoteNotFound',
  ValidToTooFarInFuture = 'ValidToTooFarInFuture',
  PreValidationError = 'PreValidationError',
}

type OnchainOrderData = {
  sender: string
  placementError: PlacementError
}

type OrderClass = 'market' | 'limit' | 'liquidity'

export type Order = {
  sellToken: string
  buyToken: string
  receiver: string
  sellAmount: string
  buyAmount: string
  validTo: number
  feeAmount: string
  kind: CoWSwapOrderKind
  partiallyFillable: boolean
  sellTokenBalance: CoWSwapSellTokenSource
  buyTokenBalance: CoWSwapBuyTokenDestination
  signingScheme: CoWSwapSigningScheme
  signature: string
  from: string
  quoteId: number
  appData: string
  appDataHash: string
  creationDate: string
  class: OrderClass
  owner: string
  uid: string
  executedSellAmount: string
  executedSellAmountBeforeFees: string
  executedBuyAmount: string
  executedFeeAmount: string
  invalidated: boolean
  status: OrderExecutionStatus
  fullFeeAmount: string
  isLiquidityOrder: boolean
  ethflowData: EthflowData
  onchainUser: string
  onchainOrderData: OnchainOrderData
  executedSurplusFee: string
  fullAppData: string
}
