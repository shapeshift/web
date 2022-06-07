import { Tx as BlockbookTx } from '@shapeshiftoss/blockbook'

import { BaseTxMetadata, StandardTx, StandardTxMetadata } from '../types'

export enum EthereumTxParser {
  ERC20Approve = 'erc20Approve'
}

export enum TxMethod {
  Approve = 'approve'
}

export interface ERC20ApproveTxMetadata extends BaseTxMetadata {
  method: TxMethod.Approve
  parser: EthereumTxParser.ERC20Approve
  assetId?: string
}

export type TxMetadata = StandardTxMetadata | ERC20ApproveTxMetadata

export interface InternalTx {
  blockNumber: string
  timeStamp: string
  hash: string
  from: string
  to: string
  value: string
  contractAddress: string
  input: string
  type: string
  gas: string
  gasUsed: string
  traceId: string
  isError: string
  errCode: string
}

export interface ParsedTx extends StandardTx {
  data?: TxMetadata
}

export type TxSpecific = Partial<Pick<ParsedTx, 'trade' | 'transfers' | 'data'>>

export interface SubParser {
  parse(tx: BlockbookTx): Promise<TxSpecific | undefined>
}
