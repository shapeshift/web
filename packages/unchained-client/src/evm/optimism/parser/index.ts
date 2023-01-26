import { optimismAssetId } from '@shapeshiftoss/caip'

import { Tx } from '../../../generated/optimism'
import { BaseTransactionParser, TransactionParserArgs } from '../../parser'
import * as zrx from '../../parser/zrx'

export const ZRX_OPTIMISM_PROXY_CONTRACT = '0xDEF1ABE32c034e558Cdd535791643C58a13aCC10'

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: TransactionParserArgs) {
    super(args)
    this.assetId = optimismAssetId

    this.registerParser(new zrx.Parser({ proxyContract: ZRX_OPTIMISM_PROXY_CONTRACT }))
  }
}
