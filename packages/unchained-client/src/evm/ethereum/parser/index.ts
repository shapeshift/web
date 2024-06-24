import type { Tx } from '../../../generated/ethereum'
import type { BaseTransactionParserArgs } from '../../parser'
import { BaseTransactionParser } from '../../parser'
import * as arbitrumBridge from '../../parser/arbitrumBridge'
import * as erc20 from '../../parser/erc20'
import * as nft from '../../parser/nft'
import * as thorchain from '../../parser/thorchain'
import * as zrx from '../../parser/zrx'
import * as cowswap from './cowswap'
import * as foxy from './foxy'
import * as uniV2 from './uniV2'
import * as weth from './weth'

export const ZRX_ETHEREUM_PROXY_CONTRACT = '0xDef1C0ded9bec7F1a1670819833240f027b25EfF'

export interface TransactionParserArgs extends BaseTransactionParserArgs {
  midgardUrl: string
}

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: TransactionParserArgs) {
    super(args)

    // due to the current parser logic, order here matters (register most generic first to most specific last)
    this.registerParsers([
      new nft.Parser({
        chainId: this.chainId,
        provider: this.provider,
        api: this.api,
      }),
      new erc20.Parser({ chainId: this.chainId, provider: this.provider }),
      new foxy.Parser(),
      new weth.Parser({ chainId: this.chainId, provider: this.provider }),
      new uniV2.Parser({ chainId: this.chainId, provider: this.provider }),
      new thorchain.Parser({
        chainId: this.chainId,
        rpcUrl: args.rpcUrl,
        midgardUrl: args.midgardUrl,
      }),
      new zrx.Parser({ proxyContract: ZRX_ETHEREUM_PROXY_CONTRACT }),
      new cowswap.Parser(),
      new arbitrumBridge.Parser({ chainId: this.chainId }),
    ])
  }
}
