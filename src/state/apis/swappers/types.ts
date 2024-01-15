import type {
  GetTradeQuoteInput,
  SwapErrorRight,
  SwapperName,
  TradeQuote,
} from '@shapeshiftoss/swapper'
import type { Result } from '@sniptt/monads'
import type { InterpolationOptions } from 'node-polyglot'
import type { ReduxState } from 'state/reducer'

export type QuoteHelperType = (
  getTradeQuoteInput: GetTradeQuoteInput,
  state: ReduxState,
) => Promise<Result<TradeQuote, SwapErrorRight>>

// The following are errors that affect all quotes
export enum TradeQuoteRequestError {
  InsufficientSellAssetBalance = 'InsufficientSellAssetBalance',
  NoConnectedWallet = 'NoConnectedWallet',
  NoQuotesAvailable = 'NoQuotesAvailable',
  SellAssetNotNotSupportedByWallet = 'SellAssetNotNotSupportedByWallet',
  BuyAssetNotNotSupportedByWallet = 'BuyAssetNotNotSupportedByWallet',
  NoReceiveAddress = 'NoReceiveAddress',
}

// The following affect individual trade quotes
export enum TradeQuoteError {
  NoQuotesAvailableForTradePair = 'NoQuotesAvailableForTradePair', // TODO: rename to UnsupportedTradePair
  SmartContractWalletNotSupported = 'SmartContractWalletNotSupported',
  TradingHalted = 'TradingHalted',
  TradingInactiveOnSellChain = 'TradingInactiveOnSellChain',
  TradingInactiveOnBuyChain = 'TradingInactiveOnBuyChain',
  SellAmountBelowTradeFee = 'SellAmountBelowTradeFee',
  InsufficientFirstHopFeeAssetBalance = 'InsufficientFirstHopFeeAssetBalance',
  InsufficientSecondHopFeeAssetBalance = 'InsufficientSecondHopFeeAssetBalance',
  InsufficientFundsForProtocolFee = 'InsufficientFundsForProtocolFee',
  IntermediaryAssetNotNotSupportedByWallet = 'IntermediaryAssetNotNotSupportedByWallet',
  UnsafeQuote = 'UnsafeQuote',
  SellAmountBelowMinimum = 'SellAmountBelowMinimum',
  InputAmountTooSmallUnknownMinimum = 'InputAmountTooSmallUnknownMinimum',
  UnknownError = 'UnknownError',
}

export type ErrorWithMeta<T> = { error: T; meta?: InterpolationOptions }

export type ApiQuote = {
  index: number
  quote: TradeQuote | undefined
  swapperName: SwapperName
  inputOutputRatio: number
  errors: ErrorWithMeta<TradeQuoteError>[]
  warnings: ErrorWithMeta<TradeQuoteError>[]
}

export type TradeQuoteResponse = {
  errors: ErrorWithMeta<TradeQuoteRequestError>[]
  quotes: ApiQuote[]
}
