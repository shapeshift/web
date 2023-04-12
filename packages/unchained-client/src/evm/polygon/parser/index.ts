import { polygonAssetId } from '@shapeshiftoss/caip'

import type { Tx } from '../../../generated/optimism'
import type { TransactionParserArgs } from '../../parser'
import { BaseTransactionParser } from '../../parser'
import * as erc20 from '../../parser/erc20'
import * as zrx from '../../parser/zrx'

export const ZRX_POLYGON_PROXY_CONTRACT = '0xdef1c0ded9bec7f1a1670819833240f027b25eff'

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: TransactionParserArgs) {
    super(args)

    this.registerParsers([
      new erc20.Parser({ chainId: this.chainId, provider: this.provider }),
      new zrx.Parser({ proxyContract: ZRX_POLYGON_PROXY_CONTRACT }),
    ])
  }
}
