import type { Tx } from '../../../../../generated/ethereum'
import { mempoolMock } from './mempoolMock'

const ethSelfSend: Tx = {
  txid: '0x854dff9231cadb562129cff006150dfc6dd1508ea2a39c9b51292d234c47a992',
  blockHash: '0xeafabfeaa242a02c116e4a67a45ef5b34b24b6743922b7d4efdad1a3e8454b24',
  blockHeight: 12697941,
  timestamp: 1624552745,
  status: 1,
  from: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
  to: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
  confirmations: 2115286,
  value: '503100000000000',
  fee: '399000000000000',
  gasLimit: '23100',
  gasUsed: '21000',
  gasPrice: '19000000000',
  inputData: '0x',
}

export default {
  tx: ethSelfSend,
  txMempool: mempoolMock(ethSelfSend),
}
