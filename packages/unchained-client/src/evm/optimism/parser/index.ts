import { optimismAssetId } from '@shapeshiftoss/caip'

import { Tx } from '../../../generated/optimism'
import { BaseTransactionParser, TransactionParserArgs } from '../../parser'

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: TransactionParserArgs) {
    super(args)
    this.assetId = optimismAssetId
  }
}
