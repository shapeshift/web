import type { BIP32Path } from '@shapeshiftoss/hdwallet-core'

import type * as types from '../types'

export type Token = types.AssetBalance & {
  symbol: string
  name: string
  precision: number
}

export type Account = {
  tokens?: Token[]
}

export type BuildTxInput = {
  memo?: string
}

export type GetFeeDataInput = {
  from: string
  memo?: string
}

export type FeeData = {
  gasPrice: string
}

export type TonSignTx = {
  addressNList: BIP32Path
  message: Uint8Array
  pubKey?: string
}
