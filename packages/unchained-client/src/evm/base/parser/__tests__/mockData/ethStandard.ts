import type { Tx } from '../../../index'
import { mempoolMock } from './mempoolMock'

const ethStandard: Tx = {
  txid: '0xae713e008e52193ca405e35f4b420d3b6c87f651fccbcdc5a5a84fb2e7248d69',
  blockHash: '0xf0bc87a778889674e1ee56b481ebda4b1673cda177a8585ffbfe832cde8dacb1',
  blockHeight: 14552771,
  timestamp: 1715894889,
  status: 1,
  from: '0xB4807865A786E9E9E26E6A9610F2078e7fc507fB',
  to: '0x0EF2639cdafD25A8ecB09e8bcfd9d237D002aD8F',
  confirmations: 21,
  value: '77742470000000000',
  fee: '1810578389898',
  gasLimit: '21000',
  gasUsed: '21000',
  gasPrice: '85812706',
}

export default {
  tx: ethStandard,
  txMempool: mempoolMock(ethStandard),
}
