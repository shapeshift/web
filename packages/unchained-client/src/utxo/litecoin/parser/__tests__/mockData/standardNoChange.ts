import type { Tx } from '../../../../../generated/litecoin'

const tx: Tx = {
  txid: 'f4d3a8c60154f13e29719efdc00b7ce8147e1bd0b5d02863310dc8dd401ac689',
  blockHash: '8a04b946cee33f094d196ac9b77b06002efa62025f458d06e2ea22757319d1ab',
  blockHeight: 2305171,
  timestamp: 1658947348,
  confirmations: 1,
  value: '340424408',
  fee: '100000',
  hex: '01000000013bf148be53ae49f142555335ba14ea297778c583ec53003ce0cdb4fbb4c7baa1020000006a47304402205b79ce288ceb094134064033cbb176058328e7282a0d4a388f8e3f9ecb0e5f4d022012a98c938a4009d45b6fee57d1ed0eb8a39a089e8e95bac1a6d103a08e06072e0121033128e1ee2a05b861f25f700c134eb21f9e88e92beb4ab23115fe419f179be5cefdffffff01d8764a140000000017a914ed9812ee29f62e6db1428dae7b1a2b32f8a30abd8700000000',
  vin: [
    {
      txid: 'a1bac7b4fbb4cde03c0053ec83c5787729ea14ba35535542f149ae53be48f13b',
      vout: '2',
      sequence: 4294967293,
      scriptSig: {
        hex: '47304402205b79ce288ceb094134064033cbb176058328e7282a0d4a388f8e3f9ecb0e5f4d022012a98c938a4009d45b6fee57d1ed0eb8a39a089e8e95bac1a6d103a08e06072e0121033128e1ee2a05b861f25f700c134eb21f9e88e92beb4ab23115fe419f179be5ce',
      },
      addresses: ['LZSEtkn8TLr5EpremqDq49CSUS1xGnkbX9'],
      value: '340524408',
    },
  ],
  vout: [
    {
      value: '340424408',
      n: 0,
      scriptPubKey: {
        hex: 'a914ed9812ee29f62e6db1428dae7b1a2b32f8a30abd87',
      },
      addresses: ['MVZSZBDqUsvzDZSvupJyPun2fb8UZKhSi7'],
    },
  ],
}

export default {
  tx,
  txMempool: { ...tx, blockHash: undefined, blockHeight: -1, confirmations: 0 } as Tx,
}
