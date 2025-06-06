import type { BaseTxMetadata, StandardTx } from '../types'
import { Dex } from '../types'
import type { Swap } from './thorchain'
import { Parser as ThorchainParser } from './thorchain'

export interface TxMetadata extends BaseTxMetadata {
  parser: 'mayachain'
  memo: string
  swap?: Swap
}

export interface ParsedTx extends StandardTx {
  data?: TxMetadata
}

export type TxSpecific = Partial<Pick<ParsedTx, 'data' | 'trade' | 'transfers'>>

export interface ParserArgs {
  midgardUrl: string
}

export class Parser extends ThorchainParser<'mayachain'> {
  constructor(args: ParserArgs) {
    super(args)

    this.dexName = Dex.Maya
    this.parserName = 'mayachain'
  }
}
