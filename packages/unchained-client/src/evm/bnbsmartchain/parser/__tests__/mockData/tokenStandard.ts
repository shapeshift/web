import type { Tx } from '../../../../../generated/bnbsmartchain'
import { mempoolMock } from './mempoolMock'

export const tokenStandard: Tx = {
  txid: '0x066f88631f834db707dd8c1503ea4fe459dc85f37e4d8c9b95af263d871c3dd4',
  blockHash: '0x091b34962754244418133697658b48bcf8036a6e440af358a951f8dba00a6a16',
  blockHeight: 25865860,
  timestamp: 1677002886,
  status: 1,
  from: '0xc4178B5673633c15c3a2077A1D7f0fF1Be8a4a44',
  to: '0x55d398326f99059fF775485246999027B3197955',
  confirmations: 957,
  value: '0',
  fee: '180936150000000',
  gasLimit: '36115',
  gasUsed: '36115',
  gasPrice: '5010000000',
  inputData:
    '0xa9059cbb000000000000000000000000c66bfff5c2ec26f60542bd3c862d7846f0783fdf00000000000000000000000000000000000000000000000ad78ebc5ac6200000',
  tokenTransfers: [
    {
      contract: '0x55d398326f99059fF775485246999027B3197955',
      decimals: 18,
      name: 'Tether USD',
      symbol: 'USDT',
      type: 'BEP20',
      from: '0xc4178B5673633c15c3a2077A1D7f0fF1Be8a4a44',
      to: '0xC66bfff5C2ec26F60542bD3C862d7846F0783fdf',
      value: '200000000000000000000',
    },
  ],
  internalTxs: [],
}

export default {
  tx: tokenStandard,
  txMempool: mempoolMock(tokenStandard),
}
