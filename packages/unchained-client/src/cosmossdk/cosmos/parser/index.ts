import { cosmosAssetId } from '@shapeshiftoss/caip'

import { Tx } from '../../../generated/cosmos'
import { BaseTransactionParser, BaseTransactionParserArgs } from '../../parser'

export type TransactionParserArgs = BaseTransactionParserArgs

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: TransactionParserArgs) {
    super(args)
    this.assetId = cosmosAssetId
  }
}
