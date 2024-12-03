import type { Nominal } from '@shapeshiftoss/caip'
import type { TypedDataField } from 'ethers'
import type { Address } from 'viem'

import type { KnownChainIds } from './base'

export type AppDataHash = Nominal<string, 'AppDataHash'>
export type AppData = Nominal<string, 'AppData'>
export type OrderId = Nominal<string, 'OrderId'>
export type QuoteId = Nominal<number, 'QuoteId'>

// The following are lifted directly out of the cowprotocol source code because ethers version conflicts prevent us importing the SDK directly.
// https://github.dev/cowprotocol/cow-sdk/blob/main/src/order-book/generated/models/

export enum TypedDataPrimaryType {
  Order = 'Order',
  OrderCancellations = 'OrderCancellations',
}

export enum OrderKind {
  BUY = 'buy',
  SELL = 'sell',
}

export enum SellTokenSource {
  ERC20 = 'erc20',
  INTERNAL = 'internal',
  EXTERNAL = 'external',
}

export enum BuyTokenDestination {
  ERC20 = 'erc20',
  INTERNAL = 'internal',
}

export enum SigningScheme {
  EIP712 = 'eip712',
  ETHSIGN = 'ethsign',
  PRESIGN = 'presign',
  EIP1271 = 'eip1271',
}

export enum EcdsaSigningScheme {
  EIP712 = 'eip712',
  ETHSIGN = 'ethsign',
}

export enum OrderClass {
  MARKET = 'market',
  LIMIT = 'limit',
  LIQUIDITY = 'liquidity',
}

export enum PlacementError {
  QUOTE_NOT_FOUND = 'QuoteNotFound',
  VALID_TO_TOO_FAR_IN_FUTURE = 'ValidToTooFarInFuture',
  PRE_VALIDATION_ERROR = 'PreValidationError',
}

export enum OrderQuoteSideKindSell {
  SELL = 'sell',
}

export enum OrderQuoteSideKindBuy {
  BUY = 'buy',
}

export enum PriceQuality {
  FAST = 'fast',
  OPTIMAL = 'optimal',
  VERIFIED = 'verified',
}

export enum OrderError {
  DUPLICATED_ORDER = 'DuplicatedOrder',
  QUOTE_NOT_FOUND = 'QuoteNotFound',
  QUOTE_NOT_VERIFIED = 'QuoteNotVerified',
  INVALID_QUOTE = 'InvalidQuote',
  MISSING_FROM = 'MissingFrom',
  WRONG_OWNER = 'WrongOwner',
  INVALID_EIP1271SIGNATURE = 'InvalidEip1271Signature',
  INSUFFICIENT_BALANCE = 'InsufficientBalance',
  INSUFFICIENT_ALLOWANCE = 'InsufficientAllowance',
  INVALID_SIGNATURE = 'InvalidSignature',
  SELL_AMOUNT_OVERFLOW = 'SellAmountOverflow',
  TRANSFER_SIMULATION_FAILED = 'TransferSimulationFailed',
  ZERO_AMOUNT = 'ZeroAmount',
  INCOMPATIBLE_SIGNING_SCHEME = 'IncompatibleSigningScheme',
  TOO_MANY_LIMIT_ORDERS = 'TooManyLimitOrders',
  TOO_MUCH_GAS = 'TooMuchGas',
  UNSUPPORTED_BUY_TOKEN_DESTINATION = 'UnsupportedBuyTokenDestination',
  UNSUPPORTED_SELL_TOKEN_SOURCE = 'UnsupportedSellTokenSource',
  UNSUPPORTED_ORDER_TYPE = 'UnsupportedOrderType',
  INSUFFICIENT_VALID_TO = 'InsufficientValidTo',
  EXCESSIVE_VALID_TO = 'ExcessiveValidTo',
  INVALID_NATIVE_SELL_TOKEN = 'InvalidNativeSellToken',
  SAME_BUY_AND_SELL_TOKEN = 'SameBuyAndSellToken',
  UNSUPPORTED_TOKEN = 'UnsupportedToken',
  INVALID_APP_DATA = 'InvalidAppData',
  APP_DATA_HASH_MISMATCH = 'AppDataHashMismatch',
  APPDATA_FROM_MISMATCH = 'AppdataFromMismatch',

  // Not documented in API docs, but exists.
  // Most likely non-exhaustive, see https://github.com/cowprotocol/contracts/blob/aaffdc55b2a13738b7c32de96f487d3eb5b4f8c6/src/ts/api.ts#L110
  SELL_AMOUNT_DOES_NOT_COVER_FEE = 'SellAmountDoesNotCoverFee',
  NO_LIQUIDITY = 'NoLiquidity',
}

export enum CompetitionOrderStatusType {
  OPEN = 'open',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  SOLVED = 'solved',
  EXECUTING = 'executing',
  TRADED = 'traded',
  CANCELLED = 'cancelled',
}

export enum OrderStatus {
  PRESIGNATURE_PENDING = 'presignaturePending',
  OPEN = 'open',
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export type OrderCreation = {
  sellToken: Address
  buyToken: Address
  receiver?: Address | null
  sellAmount: string
  buyAmount: string
  validTo: number
  feeAmount: string
  kind: OrderKind
  partiallyFillable: boolean
  sellTokenBalance?: SellTokenSource
  buyTokenBalance?: BuyTokenDestination
  signingScheme: SigningScheme
  signature: string
  from?: Address | null
  quoteId?: number | null
  appData: AppData | AppDataHash
  appDataHash?: AppDataHash | null
}

export type UnsignedOrderCreation = Omit<OrderCreation, 'signature'> &
  Partial<Pick<OrderCreation, 'signature'>>

export type EthflowData = {
  refundTxHash: string | null
  userValidTo: number
}

export type OnchainOrderData = {
  sender: Address
  placementError?: PlacementError
}

export type OrderMetaData = {
  creationDate: string
  class: OrderClass
  owner: Address
  uid: string
  availableBalance?: string | null
  executedSellAmount: string
  executedSellAmountBeforeFees: string
  executedBuyAmount: string
  isLiquidityOrder?: boolean
  ethflowData?: EthflowData
  onchainUser?: Address
  onchainOrderData?: OnchainOrderData
  executedSurplusFee?: string | null
  fullAppData?: string | null
}

export type Order = OrderCreation &
  OrderMetaData & {
    // Not documented in API docs, but exists.
    status: OrderStatus
  }

export type OrderParameters = {
  sellToken: Address
  buyToken: Address
  receiver?: Address | null
  sellAmount: string
  buyAmount: string
  validTo: number
  appData: AppDataHash
  feeAmount: string
  kind: OrderKind
  partiallyFillable: boolean
  sellTokenBalance?: SellTokenSource
  buyTokenBalance?: BuyTokenDestination
  signingScheme?: SigningScheme
}

export type OrderQuoteResponse = {
  quote: OrderParameters
  from?: Address
  expiration: string
  id?: QuoteId
  verified: boolean
}

export type OrderQuoteSide =
  | {
      kind: OrderQuoteSideKindSell
      sellAmountBeforeFee: string
    }
  | {
      kind: OrderQuoteSideKindSell
      sellAmountAfterFee: string
    }
  | {
      kind: OrderQuoteSideKindBuy
      buyAmountAfterFee: string
    }

export type OrderQuoteValidity =
  | {
      validTo?: number
    }
  | {
      validFor?: number
    }

export type OrderQuoteRequest = OrderQuoteSide &
  OrderQuoteValidity & {
    sellToken: Address
    buyToken: Address
    receiver?: Address | null
    appData?: AppData | AppDataHash
    appDataHash?: AppDataHash
    sellTokenBalance?: SellTokenSource
    buyTokenBalance?: BuyTokenDestination
    from: Address
    priceQuality?: PriceQuality
    signingScheme?: SigningScheme
    onchainOrder?: any
  }

export type OrderCancellation = {
  orderUids: string[]
  signature: string
  signingScheme: EcdsaSigningScheme
}

export type ExecutedAmounts = {
  sell: string
  buy: string
}

export type CompetitionOrderStatus = {
  type: CompetitionOrderStatusType
  value?: {
    solver: string
    executedAmounts?: ExecutedAmounts
  }[]
}

export type Quote = {
  sellAmount?: string
  buyAmount?: string
  fee?: string
}

export type PriceImprovement = {
  factor: number
  maxVolumeFactor: number
  quote: Quote
}

export type Surplus = {
  factor: number
  maxVolumeFactor: number
}

export type Volume = {
  factor: number
}

export type FeePolicy = Surplus | Volume | PriceImprovement

export type ExecutedProtocolFee = {
  policy?: FeePolicy
  amount?: string
  token?: Address
}

export type Trade = {
  blockNumber: number
  logIndex: number
  orderUid: string
  owner: Address
  sellToken: Address
  buyToken: Address
  sellAmount: string
  sellAmountBeforeFees: string
  buyAmount: string
  txHash: string | null
  executedProtocolFees?: ExecutedProtocolFee[]
}

export type CowSwapError = {
  errorType: OrderError
  description: string
  // This is not documented by CoW API so we shouldn't make assumptions about the shape, nor presence of this guy
  data?: any
}

export enum CowNetwork {
  Mainnet = 'mainnet',
  Xdai = 'xdai',
  ArbitrumOne = 'arbitrum_one',
}

export type CowChainId =
  | KnownChainIds.EthereumMainnet
  | KnownChainIds.GnosisMainnet
  | KnownChainIds.ArbitrumMainnet

export type TypedDataTypes = Record<string, TypedDataField[]>
