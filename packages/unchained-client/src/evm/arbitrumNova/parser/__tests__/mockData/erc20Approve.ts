import type { Tx } from '../../../../../evm'
import { mempoolMock } from './mempoolMock'

const erc20Approve: Tx = {
  txid: '0x0656edff12f4dd17c2bcc29706571b877f105bcfa062e6d70474f8f4d3fc7e3b',
  blockHash: '0xa221da0db6a9f920894d2a6773f5e9957c0fce306acea0351f7e776d8dde3119',
  blockHeight: 17833594,
  timestamp: 1691904756,
  status: 1,
  from: '0x7CfF1B3eD7BAc3C9d74C33c88B33aD23ef560913',
  to: '0x750ba8b76187092B0D1E87E28daaf484d1b5273b',
  confirmations: 9812297,
  value: '0',
  fee: '626630000000',
  gasLimit: '400000',
  gasUsed: '62663',
  gasPrice: '10000000',
  inputData:
    '0x095ea7b3000000000000000000000000a135b6189d2e073dfbc33c30c86bb4ecea4e2ee500000000000000000000000000000000000000000de0b6b39983494c589c0000',
  internalTxs: [],
}

export default {
  tx: erc20Approve,
  txMempool: mempoolMock(erc20Approve),
}
