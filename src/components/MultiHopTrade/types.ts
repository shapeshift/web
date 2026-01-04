import type { ChainId } from '@shapeshiftoss/caip'
import type { Account } from '@shapeshiftoss/chain-adapters'
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
  accountProvider?: (pubkey: string) => Promise<Account<ChainId>>
}

export enum TradeInputTab {
  Trade = 'trade',
  LimitOrder = 'limitOrder',
  BuyFiat = 'buy',
  SellFiat = 'sell',
}
