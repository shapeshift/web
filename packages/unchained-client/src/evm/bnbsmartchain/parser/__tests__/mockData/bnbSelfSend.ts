import type { Tx } from '../../../../../generated/bnbsmartchain'
import { mempoolMock } from './mempoolMock'

const bnbSelfSend: Tx = {
  txid: '0x025b88d4b35e1fd28ee372deb1cb28c2c862703dce444629c47e27b8b8759cc4',
  blockHash: '0x695b9e8a01b9564387bde6d52fd2775867c7b56ee0c1a9d61bbcc2b38a9c835f',
  blockHeight: 25839827,
  timestamp: 1676923869,
  status: 1,
  from: '0xC480394241c76F3993ec5D121ce4F198f7844443',
  to: '0xC480394241c76F3993ec5D121ce4F198f7844443',
  confirmations: 50,
  value: '1200000000000000000',
  fee: '105000000000000',
  gasLimit: '21000',
  gasUsed: '21000',
  gasPrice: '5000000000',
}

export default {
  tx: bnbSelfSend,
  txMempool: mempoolMock(bnbSelfSend),
}
