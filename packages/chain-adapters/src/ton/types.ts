import type { AssetId } from '@shapeshiftoss/caip'
import type { BIP32Path } from '@shapeshiftoss/hdwallet-core'

import type * as types from '../types'

export type TonToken = types.AssetBalance & {
  assetId: AssetId
  symbol: string
  name: string
  precision: number
}

export type TonAccount = {
  tokens?: TonToken[]
}

export type BuildTxInput = {
  memo?: string
  contractAddress?: string
}

export type TonGetFeeDataInput = {
  from: string
  memo?: string
  contractAddress?: string
}

export type TonFeeData = {
  gasPrice: string
  forwardFee?: string
  storageFee?: string
}

export type TonRawMessage = {
  targetAddress: string
  sendAmount: string
  payload: string
  stateInit?: string
}

export type TonSignTx = {
  addressNList: BIP32Path
  message?: Uint8Array | Buffer
  rawMessages?: TonRawMessage[]
  seqno?: number
  expireAt?: number
  pubKey?: string
}

export type Account = TonAccount
export type FeeData = TonFeeData
export type GetFeeDataInput = TonGetFeeDataInput
