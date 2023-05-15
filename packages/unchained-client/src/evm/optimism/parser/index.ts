import type { Tx } from '../../../generated/optimism'
import type { TransactionParserArgs } from '../../parser'
import { BaseTransactionParser } from '../../parser'
import * as erc20 from '../../parser/erc20'
import * as nft from '../../parser/nft'
import * as zrx from '../../parser/zrx'

export const ZRX_OPTIMISM_PROXY_CONTRACT = '0xDEF1ABE32c034e558Cdd535791643C58a13aCC10'

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: TransactionParserArgs) {
    super(args)

    this.registerParsers([
      new nft.Parser({
        chainId: this.chainId,
        provider: this.provider,
        api: this.api,
      }),
      new erc20.Parser({ chainId: this.chainId, provider: this.provider }),
      new zrx.Parser({ proxyContract: ZRX_OPTIMISM_PROXY_CONTRACT }),
    ])
  }
}
