import type { Tx } from '../../../index'
import { mempoolMock } from './mempoolMock'

const bep721: Tx = {
  txid: '0x807e3c2dca5c00e0e33a1765ac6c78d5ffe4973ef74522902edda4d1d705a38d',
  blockHash: '0xeae71d46c74f4088f0ac47463d82bd00b23fef0150e086248701a6c46c40211f',
  blockHeight: 28094889,
  timestamp: 1683742059,
  status: 1,
  from: '0xc86d6a700B82C62A14458858d17d0e6a3942f424',
  to: '0xd7C79AbEb8d8B21e7638A8aADfdcC1438d24B483',
  confirmations: 10,
  value: '0',
  fee: '201048000000000',
  gasLimit: '97016',
  gasUsed: '67016',
  gasPrice: '3000000000',
  inputData:
    '0x42842e0e000000000000000000000000c86d6a700b82c62a14458858d17d0e6a3942f42400000000000000000000000026bca820c78dde0349960457960e7b80548e37e300000000000000000000000000000000000000000000000000000000005ea10c',
  tokenTransfers: [
    {
      contract: '0xd7C79AbEb8d8B21e7638A8aADfdcC1438d24B483',
      decimals: 18,
      name: 'TAP FANTASY SKIN',
      symbol: 'TFSKIN',
      type: 'BEP721',
      from: '0xc86d6a700B82C62A14458858d17d0e6a3942f424',
      to: '0x26bCA820c78DDe0349960457960e7b80548E37e3',
      value: '1',
      id: '6201612',
    },
  ],
  internalTxs: [],
}

export default {
  tx: bep721,
  txMempool: mempoolMock(bep721),
}
