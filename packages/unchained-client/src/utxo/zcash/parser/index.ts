import type { Tx } from '../../../generated/zcash'
import type { BaseTransactionParserArgs } from '../../parser'
import { BaseTransactionParser } from '../../parser'
import * as mayachain from '../../parser/mayachain'

export interface TransactionParserArgs extends BaseTransactionParserArgs {
  midgardUrl: string
}

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: TransactionParserArgs) {
    super(args)

    this.registerParsers([new mayachain.Parser({ midgardUrl: args.midgardUrl })])
  }
}
