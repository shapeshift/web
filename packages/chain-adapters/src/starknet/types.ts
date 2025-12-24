import type { AssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'

import type { SignTx, TransferType } from '../types'
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

// RPC Response types
export type RpcJsonResponse<T = unknown> = {
  result?: T
  error?: {
    code: number
    message: string
  }
}

export type StarknetNonceResult = string

export type StarknetFeeEstimate = {
  l1_gas_consumed?: string
  l1_gas_price?: string
  l2_gas_consumed?: string
  l2_gas_price?: string
  l1_data_gas_consumed?: string
  l1_data_gas_price?: string
}

export type StarknetBlockResult = {
  timestamp?: number
}

export type StarknetTxHashResult = {
  transaction_hash: string
}

export type StarknetTxDetails = {
  fromAddress: string
  calldata: string[]
  nonce: string
  version: string
  resourceBounds: {
    l1_gas: { max_amount: bigint; max_price_per_unit: bigint }
    l2_gas: { max_amount: bigint; max_price_per_unit: bigint }
    l1_data_gas: { max_amount: bigint; max_price_per_unit: bigint }
  }
  chainId: string
}

export type SignTxWithDetails = SignTx<KnownChainIds.StarknetMainnet> & {
  _txDetails: StarknetTxDetails
}

export type TxHashOrObject = string | { transaction_hash: string }

export type StarknetReceipt = {
  block_number?: string | number
  block_hash?: string
  execution_status?: string
  actual_fee?: { amount: string } | string | number
  events?: {
    keys: string[]
    data: string[]
    from_address: string
  }[]
}

export type StarknetTransfer = {
  assetId: AssetId
  from: string[]
  to: string[]
  type: TransferType
  value: string
}
