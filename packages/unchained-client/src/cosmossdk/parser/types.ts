import { BaseTxMetadata, StandardTx } from '../../types'
import * as cosmossdk from '../types'

export type Tx = cosmossdk.Tx

export interface TxMetadata extends BaseTxMetadata {
  parser: 'cosmos'
  delegator?: string
  sourceValidator?: string
  destinationValidator?: string
  assetId?: string
  value?: string
  ibcDestination?: string
  ibcSource?: string
}

export interface ParsedTx extends StandardTx {
  data?: TxMetadata
}
