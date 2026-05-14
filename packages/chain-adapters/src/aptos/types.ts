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
  memo?: string
}

export type AptosGetFeeDataInput = {
  from: string
  memo?: string
}

export type AptosFeeData = {
  gasEstimate: string
  gasUnitPrice: string
  maxGasAmount: string
}

export type Account = AptosAccount
export type FeeData = AptosFeeData
export type GetFeeDataInput = AptosGetFeeDataInput
