import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata, Asset } from '@shapeshiftoss/types'

export enum TradeRoutePaths {
  Input = '/trade',
  Confirm = '/trade/confirm',
  VerifyAddresses = '/trade/verify-addresses',
  QuoteList = '/trade/quote-list',
  Sweep = '/trade/sweep',
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
