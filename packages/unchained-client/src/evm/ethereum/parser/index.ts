import { ZRX_ETHEREUM_PROXY_CONTRACT } from '@shapeshiftoss/contracts'

import type { Tx } from '../../../generated/ethereum'
import type { BaseTransactionParserArgs } from '../../parser'
import { BaseTransactionParser } from '../../parser'
import * as arbitrumBridge from '../../parser/arbitrumBridge'
import * as erc20 from '../../parser/erc20'
import * as mayachain from '../../parser/mayachain'
import * as thorchain from '../../parser/thorchain'
import * as zrx from '../../parser/zrx'
import * as cowswap from './cowswap'
import * as foxy from './foxy'
import * as uniV2 from './uniV2'
import * as weth from './weth'

export interface TransactionParserArgs extends BaseTransactionParserArgs {
  thorMidgardUrl: string
  mayaMidgardUrl: string
}

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: TransactionParserArgs) {
    super(args)

    // due to the current parser logic, order here matters (register most generic first to most specific last)
    this.registerParsers([
      new erc20.Parser({ chainId: this.chainId, provider: this.provider }),
      new foxy.Parser(),
      new weth.Parser({ chainId: this.chainId, provider: this.provider }),
      new uniV2.Parser({ chainId: this.chainId, provider: this.provider }),
      new mayachain.Parser({
        chainId: this.chainId,
        midgardUrl: args.mayaMidgardUrl,
      }),
      new thorchain.Parser({
        chainId: this.chainId,
        midgardUrl: args.thorMidgardUrl,
      }),
      new zrx.Parser({ proxyContract: ZRX_ETHEREUM_PROXY_CONTRACT }),
      new cowswap.Parser(),
      new arbitrumBridge.Parser({ chainId: this.chainId }),
    ])
  }
}
