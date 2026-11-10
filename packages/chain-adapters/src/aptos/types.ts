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

type GetTransferFeeDataInput = {
  from: string
  contractAddress: string | undefined
  payload?: never
}

type GetPayloadFeeDataInput = {
  from: string
  payload: string
  contractAddress?: never
}

export type GetFeeDataInput = GetTransferFeeDataInput | GetPayloadFeeDataInput
