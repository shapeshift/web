export interface TronTx {
  txid: string
  blockHash: string
  blockHeight: number
  timestamp: number
  confirmations: number
  value: string
  fee: string
  raw_data: {
    contract: {
      parameter: {
        value: {
          amount?: number
          owner_address?: string
          to_address?: string
        }
        type_url: string
      }
      type: string
    }[]
    ref_block_bytes: string
    ref_block_hash: string
    expiration: number
    timestamp: number
  }
  raw_data_hex: string
  txID: string
  signature?: string[]
  ret?: Array<{
    contractRet?: 'SUCCESS' | 'REVERT' | string
    fee?: number
  }>
}

type TRC20Token = {
  key: string
  value: number
}

export interface TronAccount {
  address: string
  balance: number
  create_time?: number
  latest_opration_time?: number
  account_resource?: {
    energy_usage?: number
    frozen_balance_for_energy?: {
      frozen_balance?: number
    }
    net_usage?: number
    frozen_balance_for_net?: {
      frozen_balance?: number
    }
  }
  assetV2?: TRC20Token[]
}

export interface TronBlock {
  blockID: string
  block_header: {
    raw_data: {
      number: number
      txTrieRoot: string
      witness_address: string
      parentHash: string
      version: number
      timestamp: number
    }
    witness_signature: string
  }
  transactions?: TronTx[]
}
