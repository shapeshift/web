import { StandardTx, StandardTxMetadata } from '../types'

export interface TxMetadata extends Omit<StandardTxMetadata, 'parser'> {
  parser: 'cosmos'
  delegator?: string
  sourceValidator?: string
  destinationValidator?: string
  /**
   * @deprecated use 'assetId' instead
   */
  caip19?: string
  assetId?: string
  value?: string
  ibcDestination?: string
  ibcSource?: string
}

export interface ParsedTx extends StandardTx {
  data?: TxMetadata
}
