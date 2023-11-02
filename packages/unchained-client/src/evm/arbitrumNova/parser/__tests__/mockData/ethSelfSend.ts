import type { Tx } from '../../../../../evm'
import { mempoolMock } from './mempoolMock'

const ethSelfSend: Tx = {
  txid: '0x96c1a931795baa2cb8b801ed1890d33508f4964ebad56dc1b45bd84d3eae0516',
  blockHash: '0x3848e40f67abf1de1b65c3094ae443764b046c47a50fbe51455406a9e5a6d2c0',
  blockHeight: 512210,
  timestamp: 1664786013,
  status: 1,
  from: '0xD056D4B6FCdcEa982F7E70F085Bbb1f9AbcD19f9',
  to: '0xD056D4B6FCdcEa982F7E70F085Bbb1f9AbcD19f9',
  confirmations: 27132739,
  value: '202000000000009001',
  fee: '2123600000000',
  gasLimit: '21326',
  gasUsed: '21236',
  gasPrice: '100000000',
}

export default {
  tx: ethSelfSend,
  txMempool: mempoolMock(ethSelfSend),
}
