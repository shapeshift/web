import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata, Asset } from '@shapeshiftoss/types'

export enum TradeRoutePaths {
  Input = '/trade',
  Confirm = 'confirm',
  VerifyAddresses = 'verify-addresses',
  QuoteList = 'quote-list',
}

export type GetReceiveAddressArgs = {
  asset: Asset
  wallet: HDWallet | null
  accountMetadata: AccountMetadata
  pubKey?: string
}

export enum TradeInputTab {
  Trade = 'trade',
  Claim = 'claim',
  LimitOrder = 'limitOrder',
  BuyFiat = 'buy',
  SellFiat = 'sell',
}
