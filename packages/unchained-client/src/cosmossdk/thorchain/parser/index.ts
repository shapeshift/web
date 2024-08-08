import type { Tx } from '../../../generated/thorchain'
import type { BaseTransactionParserArgs } from '../../parser'
import { BaseTransactionParser } from '../../parser'
import * as rfox from './rfox'
import * as thorchain from './thorchain'

export interface TransactionParserArgs extends BaseTransactionParserArgs {
  midgardUrl: string
}

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: TransactionParserArgs) {
    super(args)

    this.registerParsers([new thorchain.Parser({ midgardUrl: args.midgardUrl }), new rfox.Parser()])
  }
}
