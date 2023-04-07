import type { Tx } from '../../../../../generated/optimism'
import { mempoolMock } from './mempoolMock'

export const tokenStandard: Tx = {
  txid: '0xf8f377cc404b2662ba7538e20948725230edc96646d66172a9837c367bbec1e8',
  blockHash: '0x32529396971608df5c0d3644d53a3064368bbcfe40e57291e7a3aeb0163b3edc',
  blockHeight: 61387586,
  timestamp: 1673040990,
  status: 1,
  from: '0xBcDdd1333982B26956Bf83D6fb704bC28Dfe4aBA',
  to: '0x4200000000000000000000000000000000000042',
  confirmations: 477,
  value: '0',
  fee: '57124000000',
  gasLimit: '9000000',
  gasUsed: '57124',
  gasPrice: '1000000',
  inputData:
    '0xa9059cbb000000000000000000000000a1f55ac63e174fabaf93e6b2854da6d85c9fdc50000000000000000000000000000000000000000000000001144925a0b9314fc6',
  tokenTransfers: [
    {
      contract: '0x4200000000000000000000000000000000000042',
      decimals: 18,
      name: 'Optimism',
      symbol: 'OP',
      type: 'ERC20',
      from: '0xBcDdd1333982B26956Bf83D6fb704bC28Dfe4aBA',
      to: '0xA1f55aC63e174fAbaF93e6b2854Da6D85C9FDC50',
      value: '19908484999999999942',
    },
  ],
}

export default {
  tx: tokenStandard,
  txMempool: mempoolMock(tokenStandard),
}
