import { foxOnArbitrumOneAssetId } from '@shapeshiftoss/caip'
import { RFOX_PROXY_CONTRACT_ADDRESS } from '@shapeshiftoss/contracts'

import type { Tx } from '../../../generated/arbitrum'
import type { BaseTransactionParserArgs } from '../../parser'
import { BaseTransactionParser } from '../../parser'
import * as arbitrumBridge from '../../parser/arbitrumBridge'
import * as erc20 from '../../parser/erc20'
import * as nft from '../../parser/nft'
import * as rfox from '../../parser/rfox'
import * as zrx from '../../parser/zrx'

export const ZRX_ARBITRUM_PROXY_CONTRACT = '0xDef1C0ded9bec7F1a1670819833240f027b25EfF'

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: BaseTransactionParserArgs) {
    super(args)

    this.registerParsers([
      new nft.Parser({
        chainId: this.chainId,
        provider: this.provider,
        api: this.api,
      }),
      new erc20.Parser({ chainId: this.chainId, provider: this.provider }),
      new zrx.Parser({ proxyContract: ZRX_ARBITRUM_PROXY_CONTRACT }),
      new rfox.Parser({
        proxyContract: RFOX_PROXY_CONTRACT_ADDRESS,
        stakingAssetId: foxOnArbitrumOneAssetId,
      }),
      new arbitrumBridge.Parser({
        chainId: this.chainId,
      }),
    ])
  }
}
