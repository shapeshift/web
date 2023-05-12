import type { Tx } from '../../../generated/ethereum'
import type { TransactionParserArgs } from '../../parser'
import { BaseTransactionParser } from '../../parser'
import * as erc20 from '../../parser/erc20'
import * as nft from '../../parser/nft'
import * as zrx from '../../parser/zrx'
import * as cowswap from './cowswap'
import * as foxy from './foxy'
import * as thor from './thor'
import * as uniV2 from './uniV2'
import * as weth from './weth'
import * as yearn from './yearn'

export const ZRX_ETHEREUM_PROXY_CONTRACT = '0xDef1C0ded9bec7F1a1670819833240f027b25EfF'

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: TransactionParserArgs) {
    super(args)

    // due to the current parser logic, order here matters (register most generic first to most specific last)
    // weth and yearn have the same sigHash for deposit(), but the weth parser is stricter resulting in faster processing times
    this.registerParsers([
      new nft.Parser({
        chainId: this.chainId,
        provider: this.provider,
        api: this.api,
      }),
      new erc20.Parser({ chainId: this.chainId, provider: this.provider }),
      new yearn.Parser({ chainId: this.chainId }),
      new foxy.Parser(),
      new weth.Parser({ chainId: this.chainId, provider: this.provider }),
      new uniV2.Parser({ chainId: this.chainId, provider: this.provider }),
      new thor.Parser({ chainId: this.chainId, rpcUrl: args.rpcUrl }),
      new zrx.Parser({ proxyContract: ZRX_ETHEREUM_PROXY_CONTRACT }),
      new cowswap.Parser(),
    ])
  }
}
