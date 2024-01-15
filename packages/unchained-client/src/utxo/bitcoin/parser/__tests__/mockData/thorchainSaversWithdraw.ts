import type { Tx } from '../../../index'

const tx: Tx = {
  txid: 'f082c1509bef398e52a84a32991237ffbcc8a230c8d43cf63b6d71ffda07bc17',
  blockHash: '00000000000000000001bf0e33e237b8f517fa9dbaac41bc3fc7707cfb8cfe8e',
  blockHeight: 825043,
  timestamp: 1704828720,
  confirmations: 15,
  value: '353729',
  fee: '17640',
  hex: '02000000000101e7d3ef2181b0f90c1a18e0dd00d823993e0e2976eb52ebea9f322468bd732b290000000000ffffffff031127000000000000160014407afe0a21bd5fed4aa98da464084dd2e8a29e0d0000000000000000116a0f2d3a4254432f4254433a3130303030b03e050000000000160014e4f391ea481f014fafabb4b1f88c1ea71e110bf30247304402203649075c913ccf0d5dbb5811ffa1cc24882f0feaac337f32de05585af3b36746022002e372d4946afee6fae6437f977d6b34a9208678df9665fcbea8309ae99a81000121022f8183f4998ef0e04a09bd86a64e4e46e8ab49105dcbec6e9eb8951cc53f85b900000000',
  vin: [
    {
      txid: '292b73bd6824329feaeb52eb76290e3e9923d800dde0181a0cf9b08121efd3e7',
      sequence: 4294967295,
      addresses: ['bc1quneer6jgruq5ltatkjcl3rq75u0pzzlnrfkj5j'],
      value: '371369',
    },
  ],
  vout: [
    {
      value: '10001',
      n: 0,
      scriptPubKey: {
        hex: '0014407afe0a21bd5fed4aa98da464084dd2e8a29e0d',
      },
      addresses: ['bc1qgpa0uz3ph4076j4f3kjxgzzd6t5298sdtjvwc9'],
    },
    {
      value: '0',
      n: 1,
      opReturn: 'OP_RETURN (-:BTC/BTC:10000)',
      scriptPubKey: {
        hex: '6a0f2d3a4254432f4254433a3130303030',
      },
    },
    {
      value: '343728',
      n: 2,
      scriptPubKey: {
        hex: '0014e4f391ea481f014fafabb4b1f88c1ea71e110bf3',
      },
      addresses: ['bc1quneer6jgruq5ltatkjcl3rq75u0pzzlnrfkj5j'],
    },
  ],
}

export default { tx }
