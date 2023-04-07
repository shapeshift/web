import type { Tx } from '../../../../../generated/avalanche'
import { mempoolMock } from './mempoolMock'

const avaxSelfSend: Tx = {
  txid: '0xb2e0ad82503fbe87b60b13d91d343f1701f084ba963caf8ad17f7170eea79943',
  blockHash: '0xc98db2c34378d94debfcde42c0cf6b35c2e0a13d0fd509fce7ea745d28e8a1cd',
  blockHeight: 16979496,
  timestamp: 1657124919,
  status: 1,
  from: '0x9Da5812111DCBD65fF9b736874a89751A4F0a2F8',
  to: '0x9Da5812111DCBD65fF9b736874a89751A4F0a2F8',
  confirmations: 14,
  value: '6350190000000000000',
  fee: '573508559337000',
  gasLimit: '21000',
  gasUsed: '21000',
  gasPrice: '27309931397',
}

export default {
  tx: avaxSelfSend,
  txMempool: mempoolMock(avaxSelfSend),
}
