import base58 from 'bs58'

import * as thorchain from '../../parser/thorchain'
import type { SubParser, Tx, TxSpecific } from './types'

const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'

export interface ParserArgs {
  midgardUrl: string
}

export class Parser implements SubParser<Tx> {
  private readonly parser: thorchain.Parser

  constructor(args: ParserArgs) {
    this.parser = new thorchain.Parser({ midgardUrl: args.midgardUrl })
  }

  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    const memoInstruction = tx.instructions.find(ix => ix.programId === MEMO_PROGRAM_ID)
    if (!memoInstruction) return

    const memo = Buffer.from(base58.decode(memoInstruction.data)).toString('utf8')
    if (!memo) return

    return await this.parser.parse(memo, tx.txid)
  }
}
