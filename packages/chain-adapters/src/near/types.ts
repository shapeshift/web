import type { Transaction as NearTransaction } from '@near-js/transactions'
import type { BIP32Path } from '@shapeshiftoss/hdwallet-core'

import type * as types from '../types'

export type Account = {
  tokens?: Token[]
}

export type Token = types.AssetBalance & {
  symbol: string
  name: string
  precision: number
}

export type BuildTxInput = {
  gasPrice?: string
  contractAddress?: string // NEP-141 token contract ID for token transfers
  memo?: string // Optional memo for token transfers
}

export type GetFeeDataInput = {
  from: string
  contractAddress?: string // NEP-141 token contract - affects gas estimate
}

export type FeeData = {
  gasPrice: string
}

export type NearSignTx = {
  addressNList: BIP32Path
  transaction: NearTransaction
  txBytes: Uint8Array
  pubKey?: string
}
