import type { MultiHopExecutionStatus } from 'state/slices/swappersSlice/types'

export type StepperStep = {
  title: string
  description?: string
  stepIndicator: JSX.Element
  content?: JSX.Element
  status?: MultiHopExecutionStatus
}

export enum SelectedQuoteStatus {
  ReadyToPreview = 'ReadyToPreview',
  Loading = 'Loading',
  Updating = 'Updating',
  SellAmountBelowMinimum = 'SellAmountBelowMinimum',
  SellAmountBelowTradeFee = 'SellAmountBelowTradeFee',
  InsufficientSellSideFeeAssetBalance = 'InsufficientSellSideFeeAssetBalance',
  InsufficientBuySideFeeAssetBalance = 'InsufficientBuySideFeeAssetBalance',
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
  selectedQuoteErrors: SelectedQuoteStatus[]
  quoteStatusTranslationKey: string
  quoteHasError: boolean
  errorMessage?: string
}
