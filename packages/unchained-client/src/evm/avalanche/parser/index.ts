import { avalancheAssetId } from '@shapeshiftoss/caip'

import { Tx } from '../../../generated/avalanche'
import { BaseTransactionParser, TransactionParserArgs } from '../../parser'

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: TransactionParserArgs) {
    super(args)
    this.assetId = avalancheAssetId
  }
}
