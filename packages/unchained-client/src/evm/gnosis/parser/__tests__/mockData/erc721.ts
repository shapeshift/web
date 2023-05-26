import type { Tx } from '../../../index'
import { mempoolMock } from './mempoolMock'

const erc721: Tx = {
  txid: '0x149a4788fb6558245030eb100f09ec4d82cf2870fc4d2468aab1d8856dc984f2',
  blockHash: '0xec999dc281d0b431d8f5654f48b012813b4deaa6ce23632c15c12bafc694072f',
  blockHeight: 28085854,
  timestamp: 1684831750,
  status: 1,
  from: '0x740C80Db8aB3bacb83E6a9Fc2fE721d73b9A734d',
  to: '0x22C1f6050E56d2876009903609a2cC3fEf83B415',
  confirmations: 26,
  value: '0',
  fee: '579335660000000',
  gasLimit: '258923',
  gasUsed: '191833',
  gasPrice: '3020000000',
  inputData:
    '0xa140ae23000000000000000000000000000000000000000000000000000000000001f0b4000000000000000000000000e484e6012b3f5acb9ad769ca173dc8748dec0d72',
  tokenTransfers: [
    {
      contract: '0x22C1f6050E56d2876009903609a2cC3fEf83B415',
      decimals: 18,
      name: 'POAP',
      symbol: 'The Proof of Attendance Protocol',
      type: 'ERC721',
      from: '0x0000000000000000000000000000000000000000',
      to: '0xe484E6012b3F5ACB9aD769ca173Dc8748DEC0d72',
      value: '1',
      id: '6642412',
    },
  ],
  internalTxs: [],
}

export default {
  tx: erc721,
  txMempool: mempoolMock(erc721),
}
