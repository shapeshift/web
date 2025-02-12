import type {
  GetTradeQuoteInput,
  GetTradeRateInput,
  SwapperName,
  TradeQuote,
  TradeQuoteError as SwapperTradeQuoteError,
  TradeRate,
} from '@shapeshiftoss/swapper'
import type { InterpolationOptions } from 'node-polyglot'

// The following are errors that affect all quotes.
export enum TradeQuoteRequestError {
  InsufficientSellAssetBalance = 'InsufficientSellAssetBalance',
  NoConnectedWallet = 'NoConnectedWallet',
  NoQuotesAvailable = 'NoQuotesAvailable',
  SellAssetNotNotSupportedByWallet = 'SellAssetNotNotSupportedByWallet',
  BuyAssetNotNotSupportedByWallet = 'BuyAssetNotNotSupportedByWallet',
  NoReceiveAddress = 'NoReceiveAddress',
}

// The following affect individual trade quotes.
// These errors affect the ability to execute an individual quote as opposed to inability to get an individual quote.
export enum TradeQuoteValidationError {
  TradingInactiveOnSellChain = 'TradingInactiveOnSellChain',
  TradingInactiveOnBuyChain = 'TradingInactiveOnBuyChain',
  SellAmountBelowTradeFee = 'SellAmountBelowTradeFee',
  // Insufficient *asset* balance, handling for CoW weirdness where fees are paid in token, in *addition* to the token amount being traded.
  InsufficientFirstHopAssetBalance = 'InsufficientFirstHopAssetBalance',
  InsufficientFirstHopFeeAssetBalance = 'InsufficientFirstHopFeeAssetBalance',
  InsufficientSecondHopFeeAssetBalance = 'InsufficientSecondHopFeeAssetBalance',
  InsufficientFundsForProtocolFee = 'InsufficientFundsForProtocolFee',
  IntermediaryAssetNotNotSupportedByWallet = 'IntermediaryAssetNotNotSupportedByWallet',
  QuoteSellAmountInvalid = 'QuoteSellAmountInvalid',
  QueryFailed = 'QueryFailed',
  UnknownError = 'UnknownError',
}

// The following affect individual trade quotes.
export type TradeQuoteError = TradeQuoteValidationError | SwapperTradeQuoteError

export enum TradeQuoteWarning {
  UnsafeQuote = 'UnsafeQuote', // TODO: make swappers compute this, not swappersApi
}

export type ErrorWithMeta<T> = { error: T; meta?: InterpolationOptions }

export type ApiQuote = {
  id: string
  quote: TradeQuote | TradeRate | undefined
  swapperName: SwapperName
  inputOutputRatio: number
  errors: ErrorWithMeta<TradeQuoteError>[]
  warnings: ErrorWithMeta<TradeQuoteWarning>[]
  isStale: boolean
}

export type TradeQuoteOrRateRequest = { swapperName: SwapperName } & (
  | GetTradeQuoteInput
  | GetTradeRateInput
)
