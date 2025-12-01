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
  gasBudget?: string
  tokenId?: string
}

export type GetFeeDataInput = {
  from: string
  tokenId?: string
}

export type FeeData = {
  gasPrice: string
  gasBudget: string
}
