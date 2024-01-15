import type { Tx } from '../../../generated/litecoin'
import type { BaseTransactionParserArgs } from '../../parser'
import { BaseTransactionParser } from '../../parser'
import * as thorchain from '../../parser/thorchain'

export interface TransactionParserArgs extends BaseTransactionParserArgs {
  midgardUrl: string
}

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: TransactionParserArgs) {
    super(args)

    this.registerParsers([new thorchain.Parser({ midgardUrl: args.midgardUrl })])
  }
}
