import { avalancheAssetId } from '@shapeshiftoss/caip'

import { Tx } from '../../../generated/avalanche'
import { BaseTransactionParser, TransactionParserArgs } from '../../parser'
import * as zrx from '../../parser/zrx'

export const ZRX_AVALANCHE_PROXY_CONTRACT = '0xDef1C0ded9bec7F1a1670819833240f027b25EfF'

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: TransactionParserArgs) {
    super(args)
    this.assetId = avalancheAssetId

    this.registerParser(new zrx.Parser({ proxyContract: ZRX_AVALANCHE_PROXY_CONTRACT }))
  }
}
