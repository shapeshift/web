import type { SolanaTxInstruction } from '@shapeshiftoss/hdwallet-core'
import type { CosmosSdkChainId } from '@shapeshiftoss/types'

import type * as types from '../types'

export type Account = {
  tokens?: Token[]
}

export type Token = types.AssetBalance & {
  symbol: string
  name: string
  precision: number
}

export type BuildTransactionInput<T extends CosmosSdkChainId> = {
  account: types.Account<T>
  accountNumber: number
  memo?: string
} & types.ChainSpecificBuildTxData<T>

export type BuildTxInput = {
  computeUnitLimit?: string
  computeUnitPrice?: string
  instructions?: SolanaTxInstruction[]
}

export type GetFeeDataInput = {
  message: string
}

export type FeeData = {
  computeUnits: string
}

export type PriorityFeeData = {
  baseFee: string
  [types.FeeDataKey.Fast]: string
  [types.FeeDataKey.Average]: string
  [types.FeeDataKey.Slow]: string
}
