import type { Tx } from '../../../index'
import { mempoolMock } from './mempoolMock'

const erc20Approve: Tx = {
  txid: '0x00352c92dddf64f6a9061ede9570876d1c3907857b2c9608f4774a6fb023f5a3',
  blockHash: '0xdcb5928276d36f955628cecadac2234b339a688e6db0f2e2b9ed42df95aa624a',
  blockHeight: 28076057,
  timestamp: 1684780755,
  status: 1,
  from: '0x7c41fa622f047Ee8259A2fd05928A4103fE9b6d6',
  to: '0x4b1E2c2762667331Bc91648052F646d1b0d35984',
  confirmations: 11,
  value: '0',
  fee: '160596000000000',
  gasLimit: '53882',
  gasUsed: '53532',
  gasPrice: '3000000000',
  inputData:
    '0x095ea7b3000000000000000000000000fa5ed56a203466cbbc2430a43c66b9d8723528e70000000000000000000000000000000000000000000000000b7d38eb9f9cc4f4',
  internalTxs: [],
}

export default {
  tx: erc20Approve,
  txMempool: mempoolMock(erc20Approve),
}
