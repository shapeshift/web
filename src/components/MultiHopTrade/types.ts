import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata, Asset } from '@shapeshiftoss/types'

export enum TradeRoutePaths {
  Input = '/trade/input',
  Confirm = '/trade/confirm',
  Quotes = '/trade/quotes',
  VerifyAddresses = '/trade/verify-addresses',
  QuoteList = '/trade/quote-list',
  Claim = '/trade/claim',
  LimitOrder = '/trade/limit-order',
}

export type GetReceiveAddressArgs = {
  asset: Asset
  wallet: HDWallet
  deviceId: string
  accountMetadata: AccountMetadata
  pubKey?: string
}

export enum TradeInputTab {
  Trade = 'trade',
  Claim = 'claim',
  LimitOrder = 'limitOrder',
}
