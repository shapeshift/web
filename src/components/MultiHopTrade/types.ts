import type { Result } from '@sniptt/monads'
import type { InterpolationOptions } from 'node-polyglot'
import type { SwapErrorRight, SwapperName, TradeQuote } from 'lib/swapper/api'
import type { ThorChainId } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import type { MultiHopExecutionStatus } from 'state/slices/swappersSlice/types'

export type StepperStep = {
  title: string
  description?: string
  stepIndicator: JSX.Element
  content?: JSX.Element
  status?: MultiHopExecutionStatus
}

export enum SelectedQuoteStatus {
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
  validationErrors: SelectedQuoteStatus[]
  quoteStatusTranslation: string | [string, InterpolationOptions]
  error?: SwapErrorRight
}

export type TradeQuoteResult = {
  isLoading: boolean
  data: Result<TradeQuote<ThorChainId>, SwapErrorRight> | undefined
  swapperName: SwapperName
  error: unknown
  inputOutputRatio: number
}
