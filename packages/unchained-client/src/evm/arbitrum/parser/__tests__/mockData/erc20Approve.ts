import type { Tx } from '../../../../../generated/polygon'
import { mempoolMock } from './mempoolMock'

const erc20Approve: Tx = {
  txid: '0x294506160c72df8352c28fd328b261ccabe851aa05ca542a917a210f8c40daa0',
  blockHash: '0xcedd1122a7998ea7005f776b951ad5ea57ad4a94812b09f7cba9c21b2f479a8c',
  blockHeight: 136847729,
  timestamp: 1696270326,
  status: 1,
  from: '0x9063e1A6dd076899F6A0057475e8614e17536F59',
  to: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  confirmations: 49,
  value: '0',
  fee: '97199000000000',
  gasLimit: '1234904',
  gasUsed: '971990',
  gasPrice: '100000000',
  inputData:
    '0x095ea7b3000000000000000000000000abbc5f99639c9b6bcb58544ddf04efa6802f40640000000000000000000000000000000000000000000000000000000000f6782c',
  internalTxs: [],
}

export default {
  tx: erc20Approve,
  txMempool: mempoolMock(erc20Approve),
}
