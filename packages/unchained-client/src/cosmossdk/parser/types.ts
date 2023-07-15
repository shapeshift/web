import type { BaseTxMetadata, StandardTx } from '../../types'
import type * as cosmossdk from '../types'

export type Tx = cosmossdk.Tx

export interface StakingMetadata extends BaseTxMetadata {
  parser: 'staking'
  delegator: string
  sourceValidator?: string
  destinationValidator: string
  assetId: string
  value: string
}

export interface IbcMetadata extends BaseTxMetadata {
  parser: 'ibc'
  ibcDestination: string
  ibcSource: string
  assetId: string
  value: string
  sequence: string
}

export interface SwapMetadata extends BaseTxMetadata {
  parser: 'swap'
  memo?: string
}

export interface LpMetadata extends BaseTxMetadata {
  parser: 'lp'
  pool: string
}

export type TxMetadata = StakingMetadata | IbcMetadata | SwapMetadata | LpMetadata

export interface ParsedTx extends StandardTx {
  data?: TxMetadata
}
