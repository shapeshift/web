import type { Tx } from '../../../generated/thorchain'
import type { BaseTransactionParserArgs } from '../../parser'
import { BaseTransactionParser } from '../../parser'
import * as mayachain from '../../parser/mayachain'
import * as thorchain from '../../parser/thorchain'
import * as rfox from './rfox'

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
