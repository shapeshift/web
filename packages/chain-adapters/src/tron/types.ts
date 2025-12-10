import type { TronSignTx as BaseTronSignTx } from '@shapeshiftoss/hdwallet-core'

import type * as types from '../types'

export type Token = types.AssetBalance & {
  symbol: string
  name: string
  precision: number
}

export type Account = {
  tokens?: Token[]
}

export type FeeData = {
  bandwidth: string
}

export type BuildTxInput = {
  contractAddress?: string
  memo?: string
}

export type GetFeeDataInput = {
  from?: string
  contractAddress?: string
  memo?: string
}

export interface TronUnsignedTx {
  txID: string
  raw_data: {
    contract: {
      parameter: {
        value: {
          amount?: number
          owner_address?: string
          to_address?: string
        }
        type_url: string
      }
      type: string
    }[]
    ref_block_bytes: string
    ref_block_hash: string
    expiration: number
    timestamp: number
  }
  raw_data_hex: string
}

export interface TronSignTx extends BaseTronSignTx {
  transaction: TronUnsignedTx
}
