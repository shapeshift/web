import { EthereumTx } from '../generated/ethereum'
import { BaseTxMetadata, StandardTx, StandardTxMetadata } from '../types'

export enum TxParser {
  ERC20 = 'erc20'
}

export interface ERC20TxMetadata extends BaseTxMetadata {
  parser: TxParser.ERC20
  assetId?: string
}

export type TxMetadata = StandardTxMetadata | ERC20TxMetadata

export interface ParsedTx extends StandardTx {
  data?: TxMetadata
}

export type TxSpecific = Partial<Pick<ParsedTx, 'trade' | 'transfers' | 'data'>>

export interface SubParser {
  parse(tx: EthereumTx): Promise<TxSpecific | undefined>
}
