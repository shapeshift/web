import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { GetTradeQuoteInput, SwapErrorRight } from '@shapeshiftoss/swapper'
import type { AccountMetadata, Asset } from '@shapeshiftoss/types'
import type { InterpolationOptions } from 'node-polyglot'

export type StepperStep = {
  title: string
  description?: string | JSX.Element
  stepIndicator: JSX.Element
  content?: JSX.Element
  key: string
}

export enum ActiveQuoteStatus {
  SellAmountBelowMinimum = 'SellAmountBelowMinimum',
  SellAmountBelowTradeFee = 'SellAmountBelowTradeFee',
  InsufficientFirstHopFeeAssetBalance = 'InsufficientFirstHopFeeAssetBalance',
  InsufficientSecondHopFeeAssetBalance = 'InsufficientSecondHopFeeAssetBalance',
  InsufficientFundsForProtocolFee = 'InsufficientFundsForProtocolFee',
  InsufficientSellAssetBalance = 'InsufficientSellAssetBalance',
  NoConnectedWallet = 'NoConnectedWallet',
  SmartContractWalletNotSupported = 'SmartContractWalletNotSupported',
  SellAssetNotNotSupportedByWallet = 'SellAssetNotNotSupportedByWallet',
  IntermediaryAssetNotNotSupportedByWallet = 'IntermediaryAssetNotNotSupportedByWallet',
  BuyAssetNotNotSupportedByWallet = 'BuyAssetNotNotSupportedByWallet',
  NoReceiveAddress = 'NoReceiveAddress',
  NoQuotesAvailableForTradePair = 'NoQuotesAvailableForTradePair',
  NoQuotesAvailableForSellAmount = 'NoQuotesAvailableForSellAmount',
  TradingInactiveOnSellChain = 'TradingInactiveOnSellChain',
  TradingInactiveOnBuyChain = 'TradingInactiveOnBuyChain',
  NoQuotesAvailable = 'NoQuotesAvailable',
  UnsafeQuote = 'UnsafeQuote',
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
  VerifyAddresses = '/trade/verify-addresses',
  Approval = '/trade/approval',
}

export type GetReceiveAddressArgs = {
  asset: Asset
  wallet: HDWallet
  deviceId: string
  accountMetadata: AccountMetadata
  pubKey?: string
}

export type TradeQuoteInputCommonArgs = Pick<
  GetTradeQuoteInput,
  | 'sellAmountIncludingProtocolFeesCryptoBaseUnit'
  | 'sellAsset'
  | 'buyAsset'
  | 'receiveAddress'
  | 'accountNumber'
  | 'affiliateBps'
  | 'potentialAffiliateBps'
  | 'allowMultiHop'
  | 'slippageTolerancePercentageDecimal'
  | 'isKeepKey'
>
