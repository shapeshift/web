import type { Tx } from '../../../../../generated/bnbsmartchain'
import { mempoolMock } from './mempoolMock'

const bep20Approve: Tx = {
  txid: '0x75df3a69247731e8e4596ff7f03a3e0ec2cdbc0623eeceb165c3ffad3f3ec839',
  blockHash: '0x091b34962754244418133697658b48bcf8036a6e440af358a951f8dba00a6a16',
  blockHeight: 25865860,
  timestamp: 1677002886,
  status: 1,
  from: '0xeFcdFc962cf71Da4D147aA42A72C106d557Ae7Fe',
  to: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  confirmations: 1296,
  value: '0',
  fee: '221320000000000',
  gasLimit: '48690',
  gasUsed: '44264',
  gasPrice: '5000000000',
  inputData:
    '0x095ea7b300000000000000000000000010ed43c718714eb63d5aa57b78b54704e256024effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  internalTxs: [],
}

export default {
  tx: bep20Approve,
  txMempool: mempoolMock(bep20Approve),
}
