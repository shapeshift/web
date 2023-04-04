import type { Tx } from '../../../../../generated/avalanche'
import { mempoolMock } from './mempoolMock'

export const tokenStandard: Tx = {
  txid: '0x299b6cf79b731f2e89e6d062c051f3aa7ca168446cdbf7662e663f17a8edfae6',
  blockHash: '0x0468cd51c22f63c8a4f2a0307d8f09ff6a94d9bf8141dd768d6456b11ced167a',
  blockHeight: 16979938,
  timestamp: 1657125810,
  status: 1,
  from: '0x56b5a6c24Cb8Da581125be06361d5Cd95d7EA65b',
  to: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  confirmations: 75,
  value: '0',
  fee: '1736704000000000',
  gasLimit: '99115',
  gasUsed: '65536',
  gasPrice: '26500000000',
  inputData:
    '0xa9059cbb00000000000000000000000064e13a11b87a9025f6f4fcb0c61563984f3d58df0000000000000000000000000000000000000000000000000000000008890c3c',
  tokenTransfers: [
    {
      contract: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      decimals: 6,
      name: 'USD Coin',
      symbol: 'USDC',
      type: 'ERC20',
      from: '0x56b5a6c24Cb8Da581125be06361d5Cd95d7EA65b',
      to: '0x64e13a11b87A9025F6F4fcB0c61563984f3D58Df',
      value: '143199292',
    },
  ],
}

export default {
  tx: tokenStandard,
  txMempool: mempoolMock(tokenStandard),
}
