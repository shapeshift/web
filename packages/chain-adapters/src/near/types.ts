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
}

export type GetFeeDataInput = {
  from: string
}

export type FeeData = {
  gasPrice: string
}

export type NearTxData = {
  signerId: string
  publicKey: string
  nonce: number
  receiverId: string
  blockHash: string
  actions: Array<{
    type: string
    amount: string
  }>
}

export type NearSignTx = {
  addressNList: BIP32Path
  txData: NearTxData
  pubKey?: string
}
