import type { Tx } from '../../../index'

const tx: Tx = {
  txid: 'b4e88401bb9b2b3b17c376bf5a62efd968ddfdf796c55fd4e35d80695225c4dc',
  blockHash: '00000000000000000003aafb9d8e1935a96f13272e34aa31b6c5e3d36860d190',
  blockHeight: 824488,
  timestamp: 1704466294,
  confirmations: 576,
  value: '5285072',
  fee: '15822',
  hex: '020000000001010fb364e4def910db9e7eb94f8d7329142f50e2ceb4445c231bc65884d8cc31530000000000ffffffff03a0a64f0000000000160014bfb126731142d711d7a9dbc4065d830d92e7f6e600000000000000003a6a38242b3a54484f522e52554e453a74686f723168376a666767637071766334647a353436776d3965746c67736173307836737533713439307730fe0000000000001600146b042843137d341d59e6cbc8fa0fa48a907ed0220247304402205219c65b3136500a0a3fc51680c3a56ae655c466c8e0a761242e88382dba129402207ec4edc56aa15378caa4dad7c1ad4f2154aa42fb77c365753d05b6425fca4bb101210229ddfcc67bb4e612c3d2ac6b140f725c2d53ce3afcfac2f7f7d8e59b1a4811cb00000000',
  vin: [
    {
      txid: '5331ccd88458c61b235c44b4cee2502f1429738d4fb97e9edb10f9dee464b30f',
      sequence: 4294967295,
      addresses: ['bc1qdvzzsscn056p6k0xe0y05ray32g8a5pzs74qra'],
      value: '5300894',
    },
  ],
  vout: [
    {
      value: '5220000',
      n: 0,
      scriptPubKey: {
        hex: '0014bfb126731142d711d7a9dbc4065d830d92e7f6e6',
      },
      addresses: ['bc1qh7cjvuc3gtt3r4afm0zqvhvrpkfw0ahxrfwfgu'],
    },
    {
      value: '0',
      n: 1,
      opReturn: 'OP_RETURN ($+:THOR.RUNE:thor1h7jfggcpqvc4dz546wm9etlgsas0x6su3q490w)',
      scriptPubKey: {
        hex: '6a38242b3a54484f522e52554e453a74686f723168376a666767637071766334647a353436776d3965746c677361733078367375337134393077',
      },
    },
    {
      value: '65072',
      n: 2,
      scriptPubKey: {
        hex: '00146b042843137d341d59e6cbc8fa0fa48a907ed022',
      },
      addresses: ['bc1qdvzzsscn056p6k0xe0y05ray32g8a5pzs74qra'],
    },
  ],
}

export default { tx }
