import type { SolanaTxInstruction } from '@shapeshiftoss/hdwallet-core'
import type { CosmosSdkChainId } from '@shapeshiftoss/types'
import type { TransactionInstruction } from '@solana/web3.js'

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
  tokenId?: string
  instructions?: SolanaTxInstruction[]
  addressLookupTableAccounts?: string[]
}

export type GetFeeDataInput = {
  from: string
  tokenId?: string
  instructions?: TransactionInstruction[]
  addressLookupTableAccounts?: string[]
}

export type FeeData = {
  computeUnits: string
  priorityFee: string
}

export interface Token2022MintInfo {
  decimals: number
  freezeAuthority: string
  isInitialized: boolean
  mintAuthority: string
  supply: string
}

export interface Token2022ParsedData {
  program: string
  parsed: {
    info: Token2022MintInfo
    type: string
  }
  space: number
}

export const isToken2022AccountInfo = (
  data: Token2022ParsedData | undefined | Buffer,
): data is Token2022ParsedData => {
  if (!data || Buffer.isBuffer(data)) return false

  return (
    'program' in data &&
    typeof data.program === 'string' &&
    data.program === 'spl-token-2022' &&
    'parsed' in data &&
    'type' in data.parsed &&
    data.parsed.type === 'mint'
  )
}
