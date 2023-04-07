import type { Tx } from '../../../../../generated/avalanche'
import { mempoolMock } from './mempoolMock'

const erc20Approve: Tx = {
  txid: '0xaa8a7ad30cdcb2ec6809c177b6c2bb7a8e33beda0b3bd9b6330c3e35b8e5a8e8',
  blockHash: '0xe51b20cd3c8f8633d3facc028a08d974b5d8b7a8e300b10e226a25585eaa2948',
  blockHeight: 16980952,
  timestamp: 1657127852,
  status: 1,
  from: '0xA82a74B86fE11FB430Ce7A529C37efAd82ea222d',
  to: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  confirmations: 75,
  value: '0',
  fee: '1645985000000000',
  gasLimit: '90459',
  gasUsed: '59854',
  gasPrice: '27500000000',
  inputData:
    '0x095ea7b30000000000000000000000002237724704ea0287f2329a80704dbbb63cf803f9000000000000000000000000000000000000000000000000000000000677d3af',
}

export default {
  tx: erc20Approve,
  txMempool: mempoolMock(erc20Approve),
}
