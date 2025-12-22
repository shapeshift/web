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
  maxFee?: string
  tokenContractAddress?: string
}

export type GetFeeDataInput = {
  from: string
  tokenContractAddress?: string
}

export type FeeData = {
  maxFee: string
}
