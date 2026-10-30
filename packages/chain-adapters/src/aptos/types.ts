import type { AssetId } from '@shapeshiftoss/caip'

import type * as types from '../types'

export type Account = {
  tokens?: Token[]
}

export type Token = types.AssetBalance & {
  assetId: AssetId
  symbol: string
  name: string
  precision: number
}

export type FeeData = {
  gasUnitPrice: string
  maxGasAmount: string
}

export type BuildTxInput = FeeData & {
  contractAddress: string | undefined
}

export type BuildCustomApiTxInput = FeeData & {
  from: string
  accountNumber: number
  payload: string
}

export type GetFeeDataInput = {
  from: string
  contractAddress: string | undefined
}
