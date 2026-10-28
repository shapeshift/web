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

// contractAddress is required (undefined for native APT) so callers can't silently send APT
export type BuildTxInput = {
  contractAddress: string | undefined
}

export type AptosGetFeeDataInput = {
  from: string
  contractAddress: string | undefined
}

export type AptosFeeData = {
  gasEstimate: string
  gasUnitPrice: string
  maxGasAmount: string
}

export type Account = AptosAccount
export type FeeData = AptosFeeData
export type GetFeeDataInput = AptosGetFeeDataInput
