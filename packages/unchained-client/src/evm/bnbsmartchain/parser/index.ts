import type { Tx } from '../../../generated/bnbsmartchain'
import type { BaseTransactionParserArgs } from '../../parser'
import { BaseTransactionParser } from '../../parser'
import * as nft from '../../parser/nft'
import * as thorchain from '../../parser/thorchain'
import * as zrx from '../../parser/zrx'
import * as bep20 from './bep20'

export const ZRX_BSC_PROXY_CONTRACT = '0xDef1C0ded9bec7F1a1670819833240f027b25EfF'

export interface TransactionParserArgs extends BaseTransactionParserArgs {
  midgardUrl: string
}

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: TransactionParserArgs) {
    super(args)

    this.registerParsers([
      new nft.Parser({
        chainId: this.chainId,
        provider: this.provider,
        api: this.api,
      }),
      new bep20.Parser({ chainId: this.chainId, provider: this.provider }),
      new thorchain.Parser({
        chainId: this.chainId,
        rpcUrl: args.rpcUrl,
        midgardUrl: args.midgardUrl,
      }),
      new zrx.Parser({ proxyContract: ZRX_BSC_PROXY_CONTRACT }),
    ])
  }
}
