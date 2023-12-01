import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { InterpolationOptions } from 'node-polyglot'
import type { Asset } from 'lib/asset-service'
import type { GetTradeQuoteInput, SwapErrorRight } from 'lib/swapper/types'
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'

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
  InsufficientLastHopFeeAssetBalance = 'InsufficientLastHopFeeAssetBalance',
  InsufficientFundsForProtocolFee = 'InsufficientFundsForProtocolFee',
  InsufficientSellAssetBalance = 'InsufficientSellAssetBalance',
  NoConnectedWallet = 'NoConnectedWallet',
  SmartContractWalletNotSupported = 'SmartContractWalletNotSupported',
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
  | 'slippageTolerancePercentage'
>
