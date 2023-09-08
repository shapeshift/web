import type { Tx } from '../../../../../generated/polygon'
import { mempoolMock } from './mempoolMock'

export const tokenStandard: Tx = {
  txid: '0xf7e768e0ed801742f376a113171fa9c3ac648ebcdc624ce212c99f257070051c',
  blockHash: '0x583fbc044bef7e707480141b7bd718a865d8951182de3a996921e53a6ec155d2',
  blockHeight: 41683499,
  timestamp: 1681847736,
  status: 1,
  from: '0xfA8a5D52aFCCAF40A0999ab9347D1Ba7Edc5395b',
  to: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  confirmations: 4717,
  value: '0',
  fee: '12798989060278680',
  gasLimit: '70898',
  gasUsed: '63540',
  gasPrice: '201431996542',
  inputData:
    '0xa9059cbb000000000000000000000000ae5f1d2309272557a4f2a3c954f51af12104a2ce0000000000000000000000000000000000000000000000000000000029b92700',
  tokenTransfers: [
    {
      contract: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      decimals: 6,
      name: 'USD Coin (PoS)',
      symbol: 'USDC',
      type: 'ERC20',
      from: '0xfA8a5D52aFCCAF40A0999ab9347D1Ba7Edc5395b',
      to: '0xfA8a5D52aFCCAF40A0999ab9347D1Ba7Edc5395b',
      value: '700000000',
    },
  ],
  internalTxs: [],
}

export default {
  tx: tokenStandard,
  txMempool: mempoolMock(tokenStandard),
}
