import { bscAssetId } from '@shapeshiftoss/caip'

import { Tx } from '../../../generated/bnbsmartchain'
import { BaseTransactionParser, TransactionParserArgs } from '../../parser'
import * as bep20 from './bep20'

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: TransactionParserArgs) {
    super(args)
    this.assetId = bscAssetId

    this.registerParser(new bep20.Parser({ chainId: this.chainId, provider: this.provider }))
  }
}
