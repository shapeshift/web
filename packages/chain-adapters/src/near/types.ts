import type { Transaction as NearTransaction } from '@near-js/transactions'
import type { BIP32Path } from '@shapeshiftoss/hdwallet-core'

import type * as types from '../types'

export type FastNearToken = {
  balance: string
  contract_id: string
  last_update_block_height: number | null
}

export type FastNearFtResponse = {
  account_id: string
  tokens: FastNearToken[]
}

// Token metadata (symbol, name, precision) comes from the app's asset database
// FastNEAR API only returns balance and contract_id
export type Account = {
  tokens?: types.AssetBalance[]
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
