import type { Tx } from '../../../generated/gnosis'
import type { BaseTransactionParserArgs } from '../../parser'
import { BaseTransactionParser } from '../../parser'
import * as erc20 from '../../parser/erc20'

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: BaseTransactionParserArgs) {
    super(args)

    this.registerParsers([new erc20.Parser({ chainId: this.chainId, provider: this.provider })])
  }
}
