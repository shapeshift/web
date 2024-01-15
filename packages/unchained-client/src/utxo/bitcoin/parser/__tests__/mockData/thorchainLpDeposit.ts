import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '63718db6a7dbb2ddf0ccfc3351fba1a7ba8172bb49c463cb7c94c05dd7cf28d2',
  blockHash: '00000000000000000003a3927282def3cb9333d27a3e57fb796b7b98f1051cb1',
  blockHeight: 825042,
  timestamp: 1704828477,
  confirmations: 21,
  value: '90764750',
  fee: '35250',
  hex: '020000000001029d2037a2f19e36b986d066bc594e1596a8c9b4617584895c030c8ae1ebb8b8660000000000ffffffff907cedbbfa25c650da7bc5f2a41acfe59caa6fba85f0c39e678d4dd7ff30980c0000000000ffffffff03804a5d050000000016001427fce96d5f6a72244e56563c7eb41fb79ac5ecf00000000000000000106a0e2b3a4254432e4254433a3a743a304eab0b00000000001600149f9499b55e1a6d18c8da0ed1f9ff46565fec1f0602483045022100819c94dc2ad05ab229697c159eb4e9652c8cd9af60d6a0d1fbda4226429c6ff90220025bc0d996ba76e8ac687f2ccdf50cc2eb588ef4fe07d269fe06ff90478cde1a0121028aa8d2b3800844316100cb564d3e477a18e4aa42a6b17b3d5e97625842fe229602473044022007e40b32390201ca59f00f52bb08128b585006d73d32f6fec2cc47f7431d94d5022025bf00e1a2e05904e8c51b65f0361aa926a64392271dc5d5a6f3f739ef8b926d0121028aa8d2b3800844316100cb564d3e477a18e4aa42a6b17b3d5e97625842fe229600000000',
  vin: [
    {
      txid: '66b8b8ebe18a0c035c89847561b4c9a896154e59bc66d086b9369ef1a237209d',
      sequence: 4294967295,
      addresses: ['bc1qn72fnd27rfk33jx6pmglnl6x2e07c8cxnahrgj'],
      value: '80800000',
    },
    {
      txid: '0c9830ffd74d8d679ec3f085ba6faa9ce5cf1aa4f2c57bda50c625fabbed7c90',
      sequence: 4294967295,
      addresses: ['bc1qn72fnd27rfk33jx6pmglnl6x2e07c8cxnahrgj'],
      value: '10000000',
    },
  ],
  vout: [
    {
      value: '90000000',
      n: 0,
      scriptPubKey: {
        hex: '001427fce96d5f6a72244e56563c7eb41fb79ac5ecf0',
      },
      addresses: ['bc1qyl7wjm2ldfezgnjk2c78adqlk7dvtm8sd7gn0q'],
    },
    {
      value: '0',
      n: 1,
      opReturn: 'OP_RETURN (+:BTC.BTC::t:0)',
      scriptPubKey: {
        hex: '6a0e2b3a4254432e4254433a3a743a30',
      },
    },
    {
      value: '764750',
      n: 2,
      scriptPubKey: {
        hex: '00149f9499b55e1a6d18c8da0ed1f9ff46565fec1f06',
      },
      addresses: ['bc1qn72fnd27rfk33jx6pmglnl6x2e07c8cxnahrgj'],
    },
  ],
}

export default { tx }
