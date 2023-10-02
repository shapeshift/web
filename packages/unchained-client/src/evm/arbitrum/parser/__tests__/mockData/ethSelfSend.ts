import type { Tx } from '../../../..'
import { mempoolMock } from './mempoolMock'

const ethSelfSend: Tx = {
  txid: '0x3cad84c35dd761d8869885993802e8ffaeab2c3991fe12ff743f0ae3d0b47c04',
  blockHash: '0xa3a8b2e11e08069dadfe0da91b12ff8f342eeab8bb8011965b78ef26d288553d',
  blockHeight: 136820435,
  timestamp: 1696263034,
  status: 1,
  from: '0xEDf4cA2BAE39c3e65e3216985c18ec632193aBAE',
  to: '0xEDf4cA2BAE39c3e65e3216985c18ec632193aBAE',
  confirmations: 198,
  value: '642255590800000008',
  fee: '79945000000000',
  gasLimit: '560440',
  gasUsed: '399725',
  gasPrice: '200000000',
}

export default {
  tx: ethSelfSend,
  txMempool: mempoolMock(ethSelfSend),
}
