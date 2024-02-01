import { Parser as ThorchainParser } from '../../parser/thorchain'
import type { SubParser, Tx, TxSpecific } from '../parser'

export interface ParserArgs {
  midgardUrl: string
}

export class Parser implements SubParser<Tx> {
  private readonly thorchainParser: ThorchainParser

  constructor(args: ParserArgs) {
    this.thorchainParser = new ThorchainParser({ midgardUrl: args.midgardUrl })
  }

  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    if (!tx.memo) return
    return await this.thorchainParser.parse(tx.memo)
  }
}
