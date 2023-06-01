import type { Tx } from '../../../index'
import { mempoolMock } from './mempoolMock'

const xdaiStandard: Tx = {
  txid: '0xaec3a622d50524197dd31d5bebc13077825e3f4851d49802e54a16aae0afaa86',
  blockHash: '0xbc3c42c78d368a499e0f1e5e8cfb37a977980e4527a8c97c7c46a07a18163e65',
  blockHeight: 28073464,
  timestamp: 1684767285,
  status: 1,
  from: '0xecbb714842DA98B7c6FEB25937b13087ff443437',
  to: '0x36023af898264B2f4095dA46d6c316D38C88C7DC',
  confirmations: 12928,
  value: '10000000000000000000',
  fee: '73332000000000',
  gasLimit: '21000',
  gasUsed: '21000',
  gasPrice: '3492000000',
}

export default {
  tx: xdaiStandard,
  txMempool: mempoolMock(xdaiStandard),
}
