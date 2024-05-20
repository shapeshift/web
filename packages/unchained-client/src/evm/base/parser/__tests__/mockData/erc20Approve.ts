import type { Tx } from '../../../index'
import { mempoolMock } from './mempoolMock'

const erc20Approve: Tx = {
  txid: '0xc54e8884c77318b0d4d3ae6f5f8dbc33fff71e9a69e06ee2f9b2ca827de447ed',
  blockHash: '0xf60ffaf246c9c9ce021ce30aed06c6f2a84112661a79d7e95001d03af1d59bd1',
  blockHeight: 14549101,
  timestamp: 1715887549,
  status: 1,
  from: '0xaC9a7d5AeDaCccF110315fB6354cACa910774687',
  to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  confirmations: 4857,
  value: '0',
  fee: '3020282099965',
  gasLimit: '84378',
  gasUsed: '55449',
  gasPrice: '54202390',
  inputData:
    '0x095ea7b30000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae000000000000000000000000000000000000000000000000000000000cfde636',
  internalTxs: [],
}

export default {
  tx: erc20Approve,
  txMempool: mempoolMock(erc20Approve),
}
