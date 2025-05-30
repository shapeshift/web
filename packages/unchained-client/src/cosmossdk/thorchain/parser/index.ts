import type { Tx } from '../../../generated/thorchain'
import type { BaseTransactionParserArgs } from '../../parser'
import { BaseTransactionParser } from '../../parser'
import * as mayachain from './mayachain'
import * as rfox from './rfox'
import * as thorchain from './thorchain'

export interface TransactionParserArgs extends BaseTransactionParserArgs {
  thorMidgardUrl: string
  mayaMidgardUrl: string
}

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: TransactionParserArgs) {
    super(args)

    this.registerParsers([
      new mayachain.Parser({ midgardUrl: args.mayaMidgardUrl }),
      new thorchain.Parser({ midgardUrl: args.thorMidgardUrl }),
      new rfox.Parser(),
    ])
  }
}
