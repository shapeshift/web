import { foxOnArbitrumOneAssetId, uniV2EthFoxArbitrumAssetId } from '@shapeshiftoss/caip'
import {
  RFOX_PROXY_CONTRACT,
  RFOX_UNI_V2_ETH_FOX_PROXY_CONTRACT,
  ZRX_ETHEREUM_PROXY_CONTRACT,
} from '@shapeshiftoss/contracts'

import type { Tx } from '../../../generated/arbitrum'
import type { BaseTransactionParserArgs } from '../../parser'
import { BaseTransactionParser } from '../../parser'
import * as arbitrumBridge from '../../parser/arbitrumBridge'
import * as erc20 from '../../parser/erc20'
import * as mayachain from '../../parser/mayachain'
import * as rfox from '../../parser/rfox'
import * as zrx from '../../parser/zrx'

export interface TransactionParserArgs extends BaseTransactionParserArgs {
  mayaMidgardUrl: string
}

export class TransactionParser extends BaseTransactionParser<Tx> {
  constructor(args: TransactionParserArgs) {
    super(args)

    this.registerParsers([
      new erc20.Parser({ chainId: this.chainId, provider: this.provider }),
      new mayachain.Parser({
        chainId: this.chainId,
        midgardUrl: args.mayaMidgardUrl,
      }),
      new zrx.Parser({ proxyContract: ZRX_ETHEREUM_PROXY_CONTRACT }),
      new rfox.Parser({
        proxyContract: RFOX_PROXY_CONTRACT,
        stakingAssetId: foxOnArbitrumOneAssetId,
      }),
      new rfox.Parser({
        proxyContract: RFOX_UNI_V2_ETH_FOX_PROXY_CONTRACT,
        stakingAssetId: uniV2EthFoxArbitrumAssetId,
      }),
      new arbitrumBridge.Parser({
        chainId: this.chainId,
      }),
    ])
  }
}
