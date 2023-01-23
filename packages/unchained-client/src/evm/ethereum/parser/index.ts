import { ethAssetId } from '@shapeshiftoss/caip'

import { Tx } from '../../../generated/ethereum'
import { BaseTransactionParser, TransactionParserArgs } from '../../parser'
import * as zrx from '../../parser/zrx'
import * as cowswap from './cowswap'
import * as foxy from './foxy'
import * as thor from './thor'
import * as uniV2 from './uniV2'
import * as weth from './weth'
import * as yearn from './yearn'

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: TransactionParserArgs) {
    super(args)

    this.assetId = ethAssetId

    // due to the current parser logic, order here matters (register most generic first to most specific last)
    // weth and yearn have the same sigHash for deposit(), but the weth parser is stricter resulting in faster processing times
    this.registerParsers([
      new yearn.Parser({ chainId: this.chainId }),
      new foxy.Parser(),
      new weth.Parser({ chainId: this.chainId, provider: this.provider }),
      new uniV2.Parser({ chainId: this.chainId, provider: this.provider }),
      new thor.Parser({ chainId: this.chainId, rpcUrl: args.rpcUrl }),
      new zrx.Parser(),
      new cowswap.Parser(),
    ])
  }
}
