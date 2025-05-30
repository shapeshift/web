import { Parser as ThorchainParser } from '../../parser/thorchain'
import type { SubParser, Tx, TxSpecific } from '../parser'

const opReturnRegex = /OP_RETURN \((?<memo>[^)]+)\)/

export interface ParserArgs {
  midgardUrl: string
}

export class Parser implements SubParser<Tx> {
  protected parser: ThorchainParser<'thorchain' | 'mayachain'>

  constructor(args: ParserArgs) {
    this.parser = new ThorchainParser({ midgardUrl: args.midgardUrl })
  }

  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    const opReturn = tx.vout.find(vout => vout.opReturn)?.opReturn
    if (!opReturn) return

    const memo = opReturn.match(opReturnRegex)?.groups?.memo

    if (!memo) return
    return await this.parser.parse(memo)
  }
}
