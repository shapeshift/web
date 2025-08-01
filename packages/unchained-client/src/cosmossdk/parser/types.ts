import type * as mayachain from '../../parser/mayachain'
import type * as thorchain from '../../parser/thorchain'
import type { BaseTxMetadata, StandardTx } from '../../types'
import type * as rfox from '../thorchain/parser/rfox'
import type * as cosmossdk from '../types'

export type Tx = cosmossdk.Tx

export type TxMetadata =
  | StakingMetadata
  | LpMetadata
  | thorchain.TxMetadata
  | mayachain.TxMetadata
  | rfox.TxMetadata

export interface StakingMetadata extends BaseTxMetadata {
  parser: 'staking'
  delegator: string
  sourceValidator?: string
  destinationValidator: string
  assetId: string
  value: string
}

export interface LpMetadata extends BaseTxMetadata {
  parser: 'lp'
  pool: string
}

export interface ParsedTx extends StandardTx {
  data?: TxMetadata
}

export type TxSpecific = Partial<Pick<ParsedTx, 'data' | 'trade' | 'transfers'>>

export interface SubParser<T extends Tx, U = TxSpecific> {
  parse(tx: T, address: string): Promise<U | undefined>
}
