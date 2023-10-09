import type { Tx } from '../../../..'
import { mempoolMock } from './mempoolMock'

export const tokenStandard: Tx = {
  txid: '0x4e2169f1bf5044c374a877e296fb4b2a920f424dcacb4c6e5873e49278bb6f88',
  blockHash: '0x91d9d3149bbc38dfe4f9f6c9c2afdd1b646ff36d344d41ae0ca8398d1d18917c',
  blockHeight: 136822175,
  timestamp: 1696263482,
  status: 1,
  from: '0x3464500CaD953053cDF19DA6175139E6a3Aa2775',
  to: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  confirmations: 814,
  value: '0',
  fee: '68640360000000',
  gasLimit: '1097658',
  gasUsed: '572003',
  gasPrice: '120000000',
  inputData:
    '0xa9059cbb0000000000000000000000002cbba5bcf26d37855356f8b5d68e32544bfde5690000000000000000000000000000000000000000000000000000000007b8c577',
  tokenTransfers: [
    {
      contract: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      decimals: 6,
      name: 'USD Coin',
      symbol: 'USDC',
      type: 'ERC20',
      from: '0x3464500CaD953053cDF19DA6175139E6a3Aa2775',
      to: '0x3464500CaD953053cDF19DA6175139E6a3Aa2775',
      value: '129549687',
    },
  ],
  internalTxs: [],
}

export default {
  tx: tokenStandard,
  txMempool: mempoolMock(tokenStandard),
}
