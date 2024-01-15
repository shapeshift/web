import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '28858da8fd927ebef6c8eb5c4dc56e9fbb5007fbd9c4ddbff41af103b1faafe5',
  blockHash: '000000000000000000008fa0238f5e117dbf3443dbdd3129446880413d605168',
  blockHeight: 824798,
  timestamp: 1704673512,
  confirmations: 547,
  value: '20203297',
  fee: '19140',
  hex: '020000000001013df989be242aecaa1af9b643f0c5a0a8d01f853283d0b045e6e2f1e37a2c7bbf0200000000ffffffff03e2a90d0100000000160014bfb126731142d711d7a9dbc4065d830d92e7f6e60000000000000000376a35242d3a4254432e4254433a626331713361326d653063726b6d3061703237797468646176666132306c32746777336373347466346b3f9d2600000000001600148f55bcbf03b6dfd0abc45ddbd627aa7fd4b43a380247304402204fa1392da4b56843df96a14e686f1a240de471670062fdc5ff67ffa293003842022014bc41e4bb390cd0c1ac0213697eae3841b1d229dae9432f9c67d1b181d57867012102132adbcafd051b36d6e1ad8ec720128d49a76033ce2a36c25ad9498637a21d8600000000',
  vin: [
    {
      txid: 'bf7b2c7ae3f1e2e645b0d08332851fd0a8a0c5f043b6f91aaaec2a24be89f93d',
      vout: '2',
      sequence: 4294967295,
      addresses: ['bc1q3a2me0crkm0ap27ythdavfa20l2tgw3cs4tf4k'],
      value: '20222437',
    },
  ],
  vout: [
    {
      value: '17672674',
      n: 0,
      scriptPubKey: {
        hex: '0014bfb126731142d711d7a9dbc4065d830d92e7f6e6',
      },
      addresses: ['bc1qh7cjvuc3gtt3r4afm0zqvhvrpkfw0ahxrfwfgu'],
    },
    {
      value: '0',
      n: 1,
      opReturn: 'OP_RETURN ($-:BTC.BTC:bc1q3a2me0crkm0ap27ythdavfa20l2tgw3cs4tf4k)',
      scriptPubKey: {
        hex: '6a35242d3a4254432e4254433a626331713361326d653063726b6d3061703237797468646176666132306c32746777336373347466346b',
      },
    },
    {
      value: '2530623',
      n: 2,
      scriptPubKey: {
        hex: '00148f55bcbf03b6dfd0abc45ddbd627aa7fd4b43a38',
      },
      addresses: ['bc1q3a2me0crkm0ap27ythdavfa20l2tgw3cs4tf4k'],
    },
  ],
}

export default { tx }
