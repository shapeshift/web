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
export enum TradeQuoteRequestValidationError {
  InsufficientSellAssetBalance = 'InsufficientSellAssetBalance',
  NoConnectedWallet = 'NoConnectedWallet',
  NoQuotesAvailable = 'NoQuotesAvailable',
  SellAssetNotNotSupportedByWallet = 'SellAssetNotNotSupportedByWallet',
  BuyAssetNotNotSupportedByWallet = 'BuyAssetNotNotSupportedByWallet',
  NoReceiveAddress = 'NoReceiveAddress',
}

// The following affect individual trade quotes
export enum TradeQuoteError {
  SmartContractWalletNotSupported = 'SmartContractWalletNotSupported',
  TradingInactiveOnSellChain = 'TradingInactiveOnSellChain',
  TradingInactiveOnBuyChain = 'TradingInactiveOnBuyChain',
  SellAmountBelowMinimum = 'SellAmountBelowMinimum',
  SellAmountBelowTradeFee = 'SellAmountBelowTradeFee',
  InsufficientFirstHopFeeAssetBalance = 'InsufficientFirstHopFeeAssetBalance',
  InsufficientSecondHopFeeAssetBalance = 'InsufficientSecondHopFeeAssetBalance',
  InsufficientFundsForProtocolFee = 'InsufficientFundsForProtocolFee',
  IntermediaryAssetNotNotSupportedByWallet = 'IntermediaryAssetNotNotSupportedByWallet',
  UnsafeQuote = 'UnsafeQuote',
  UnknownError = 'UnknownError',
}

export type ValidationMeta<T extends string> = { error: T; meta?: InterpolationOptions }

export type ApiQuote = {
  index: number
  quote: TradeQuote | undefined
  swapperName: SwapperName
  inputOutputRatio: number
  validationErrors: ValidationMeta<TradeQuoteError>[]
}

export type TradeQuoteResponse = {
  validationErrors: ValidationMeta<TradeQuoteRequestValidationError>[]
  quotes: ApiQuote[]
}
