import type { InterpolationOptions } from 'node-polyglot'
import type { SwapErrorRight } from 'lib/swapper/api'
import type { MultiHopExecutionStatus } from 'state/slices/swappersSlice/types'

export type StepperStep = {
  title: string
  description?: string
  stepIndicator: JSX.Element
  content?: JSX.Element
  status?: MultiHopExecutionStatus
}

export enum ActiveQuoteStatus {
  SellAmountBelowMinimum = 'SellAmountBelowMinimum',
  SellAmountBelowTradeFee = 'SellAmountBelowTradeFee',
  InsufficientFirstHopFeeAssetBalance = 'InsufficientFirstHopFeeAssetBalance',
  InsufficientLastHopFeeAssetBalance = 'InsufficientLastHopFeeAssetBalance',
  InsufficientSellAssetBalance = 'InsufficientSellAssetBalance',
  NoConnectedWallet = 'NoConnectedWallet',
  SellAssetNotNotSupportedByWallet = 'SellAssetNotNotSupportedByWallet',
  BuyAssetNotNotSupportedByWallet = 'BuyAssetNotNotSupportedByWallet',
  NoReceiveAddress = 'NoReceiveAddress',
  NoQuotesAvailableForTradePair = 'NoQuotesAvailableForTradePair',
  NoQuotesAvailableForSellAmount = 'NoQuotesAvailableForSellAmount',
  TradingInactiveOnSellChain = 'TradingInactiveOnSellChain',
  TradingInactiveOnBuyChain = 'TradingInactiveOnBuyChain',
  NoQuotesAvailable = 'NoQuotesAvailable',
  UnknownError = 'UnknownError',
}

export type QuoteStatus = {
  validationErrors: ActiveQuoteStatus[]
  quoteStatusTranslation: string | [string, InterpolationOptions]
  error?: SwapErrorRight
}

export enum TradeRoutePaths {
  Input = '/trade/input',
  Confirm = '/trade/confirm',
  Approval = '/trade/approval',
}
