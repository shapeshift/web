import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { InterpolationOptions } from 'node-polyglot'
import type { Asset } from 'lib/asset-service'
import type { GetTradeQuoteInput, SwapErrorRight } from 'lib/swapper/api'
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'
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
  InsufficientFundsForProtocolFee = 'InsufficientFundsForProtocolFee',
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
  quoteErrors: ActiveQuoteStatus[]
  quoteStatusTranslation: string | [string, InterpolationOptions]
  error?: SwapErrorRight
}

export enum TradeRoutePaths {
  Input = '/trade/input',
  Confirm = '/trade/confirm',
  Approval = '/trade/approval',
}

export type GetReceiveAddressArgs = {
  asset: Asset
  wallet: HDWallet | null
  accountMetadata: AccountMetadata
}

export type TradeQuoteInputCommonArgs = Pick<
  GetTradeQuoteInput,
  | 'sellAmountIncludingProtocolFeesCryptoBaseUnit'
  | 'sellAsset'
  | 'buyAsset'
  | 'receiveAddress'
  | 'accountNumber'
  | 'affiliateBps'
  | 'allowMultiHop'
  | 'slippageTolerancePercentage'
>
