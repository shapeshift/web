import type { AssetId } from '@shapeshiftoss/caip'

import type * as types from '../types'

export type AptosToken = types.AssetBalance & {
  assetId: AssetId
  symbol: string
  name: string
  precision: number
}

export type AptosAccount = {
  tokens?: AptosToken[]
}

export type BuildTxInput = {
  contractAddress: string | undefined
  gasUnitPrice: string
  maxGasAmount: string
}

export type AptosGetFeeDataInput = {
  from: string
  contractAddress: string | undefined
}

export type AptosFeeData = {
  gasUnitPrice: string
  maxGasAmount: string
}

export type Account = AptosAccount
export type FeeData = AptosFeeData
export type GetFeeDataInput = AptosGetFeeDataInput
