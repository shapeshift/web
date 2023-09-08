import type { Tx } from '../../../../../generated/polygon'
import { mempoolMock } from './mempoolMock'

const maticSelfSend: Tx = {
  txid: '0x6eb5d329b6d37dd3bd3bfb517d3d21c88f09f9fe77572b8ebe5730873cc12581',
  blockHash: '0xcee8f3c4a91d119d3d1c2dbe43dd18fa5ae4060d987ca9d2362e929f2caa4dfa',
  blockHeight: 41688283,
  timestamp: 1681858754,
  status: 1,
  from: '0xC070A61D043189D99bbf4baA58226bf0991c7b11',
  to: '0xC070A61D043189D99bbf4baA58226bf0991c7b11',
  confirmations: 5,
  value: '4079513530000000000',
  fee: '5618286173997000',
  gasLimit: '100000',
  gasUsed: '21000',
  gasPrice: '267537436857',
}

export default {
  tx: maticSelfSend,
  txMempool: mempoolMock(maticSelfSend),
}
