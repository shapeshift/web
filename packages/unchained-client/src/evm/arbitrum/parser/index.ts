import { foxOnArbitrumOneAssetId } from '@shapeshiftoss/caip'

import type { Tx } from '../../../generated/arbitrum'
import type { BaseTransactionParserArgs } from '../../parser'
import { BaseTransactionParser } from '../../parser'
import * as arbitrumBridge from '../../parser/arbitrumBridge'
import * as erc20 from '../../parser/erc20'
import * as nft from '../../parser/nft'
import * as rfox from '../../parser/rfox'
import * as zrx from '../../parser/zrx'

export const ZRX_ARBITRUM_PROXY_CONTRACT = '0xDef1C0ded9bec7F1a1670819833240f027b25EfF'
export const RFOX_PROXY_CONTRACT_ADDRESS = '0xaC2a4fD70BCD8Bab0662960455c363735f0e2b56'
export const ARBITRUM_BRIDGE_PROXY_CONTRACT = '0x5288c571Fd7aD117beA99bF60FE0846C4E84F933'
export const ARBITRUM_SYS_CONTRACT = '0x0000000000000000000000000000000000000064'
export const ARBITRUM_RETRYABLE_CONTRACT = '0x000000000000000000000000000000000000006e'
export const ETHEREUM_TO_ARBITRUM_PROXY_CONTRACT = '0x72ce9c846789fdb6fc1f34ac4ad25dd9ef7031ef'

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
        proxyContract: process.env.REACT_APP_RFOX_PROXY_CONTRACT_ADDRESS ?? '',
        stakingAssetId: foxOnArbitrumOneAssetId,
      }),
      new arbitrumBridge.Parser({
        chainId: this.chainId,
        proxyContract: ARBITRUM_BRIDGE_PROXY_CONTRACT,
      }),
    ])
  }
}
