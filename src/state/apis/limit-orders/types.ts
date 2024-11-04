import type { AssetReference, ChainId, Nominal } from '@shapeshiftoss/caip'
import type {
  CoWSwapBuyTokenDestination,
  CoWSwapOrderKind,
  CoWSwapSellTokenSource,
  CoWSwapSigningScheme,
} from '@shapeshiftoss/swapper'

export enum PriceQuality {
  Fast = 'fast',
  Optimal = 'optimal',
  Verified = 'verified',
}

export type LimitOrderId = Nominal<string, 'LimitOrderId'>
export type LimitOrderQuoteId = Nominal<number, 'LimitOrderQuoteId'>
export type LimitOrderQuoteRequest = {
  sellToken: AssetReference
  buyToken: AssetReference
  receiver?: string
  appData?: string
  appDataHash?: string
  sellTokenBalance?: CoWSwapSellTokenSource
  buyTokenBalance?: CoWSwapBuyTokenDestination
  from: string
  priceQuality?: PriceQuality
  signingScheme?: CoWSwapSigningScheme
  onChainOrder?: boolean
  kind: CoWSwapOrderKind.Sell
  sellAmountBeforeFee: string
}

export type LimitOrder = {
  sellToken: AssetReference
  buyToken: AssetReference
  receiver?: string
  sellAmount: string
  buyAmount: string
  validTo: number
  feeAmount: string
  kind: CoWSwapOrderKind
  partiallyFillable: boolean
  sellTokenBalance?: CoWSwapSellTokenSource
  buyTokenBalance?: CoWSwapBuyTokenDestination
  signingScheme: CoWSwapSigningScheme
  signature: string
  from?: string
  quoteId?: LimitOrderQuoteId
  appData: string
  appDataHash?: string
}

export type CancelLimitOrdersRequest = {
  orderUids?: string[]
  signature: string
  signingScheme: CoWSwapSigningScheme
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
  executedAmounts?: ExecutedAmounts
}

export type CompetitionOrderStatus = {
  type: OrderExecutionStatus
  value?: OrderExecution[]
}

type Quote = {
  sellAmount: string
  buyAmount: string
  fee: string
}

type SurplusFeePolicy = {
  factor: number
  maxVolumeFactor: number
}

type VolumeFeePolicy = {
  factor: number
}

type PriceImprovementFeePolicy = {
  factor: number
  maxVolumeFactor: number
  quote: Quote
}

type ExecutedProtocolFee = {
  policy?: SurplusFeePolicy | VolumeFeePolicy | PriceImprovementFeePolicy
  amount?: string
  token?: string
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
  executedProtocolFees: ExecutedProtocolFee[]
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
  placementError?: PlacementError
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
  sellTokenBalance?: CoWSwapSellTokenSource
  buyTokenBalance?: CoWSwapBuyTokenDestination
  signingScheme: CoWSwapSigningScheme
  signature: string
  from?: string
  quoteId?: number
  appData: string
  appDataHash?: string
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
  fullFeeAmount?: string
  isLiquidityOrder?: boolean
  ethflowData?: EthflowData
  onchainUser?: string
  onchainOrderData?: OnchainOrderData
  executedSurplusFee?: string
  fullAppData?: string
}
