import type { Tx } from '../../../../../generated/optimism'
import { mempoolMock } from './mempoolMock'

const ethSelfSend: Tx = {
  txid: '0xabdde729b7c9a0a502e9accd08b3989f64b1226cb2dd9702577f9f5785153e5c',
  blockHash: '0x3366c1dcd1872743621c4d72728876c36e6d60ebc2743936453fe930b420045e',
  blockHeight: 61385244,
  timestamp: 1673040374,
  status: 1,
  from: '0x92BD687953Da50855AeE2Df0Cff282cC2d5F226b',
  to: '0x92BD687953Da50855AeE2Df0Cff282cC2d5F226b',
  confirmations: 1930,
  value: '15000000000000000',
  fee: '2100000000000',
  gasLimit: '350000',
  gasUsed: '21000',
  gasPrice: '100000000',
}

export default {
  tx: ethSelfSend,
  txMempool: mempoolMock(ethSelfSend),
}
