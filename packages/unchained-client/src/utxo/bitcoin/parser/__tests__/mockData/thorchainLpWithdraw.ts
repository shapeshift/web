import type { Tx } from '../../../index'

const tx: Tx = {
  txid: 'f59341d17abd6bf27754a78ab7adb2d4b266ce3e67fb67bab9520601c1feab4d',
  blockHash: '00000000000000000001c179a607f1ea9bec0ddc91da473e3656d2372f0f3037',
  blockHeight: 824921,
  timestamp: 1704760752,
  confirmations: 143,
  value: '1982360',
  fee: '17640',
  hex: '02000000000101552ce08d292a0d02aa972c046212442e31e20c50bfe85a1a53936551ed7df94e0000000000ffffffff031127000000000000160014407afe0a21bd5fed4aa98da464084dd2e8a29e0d0000000000000000116a0f2d3a4254432e4254433a313030303087181e00000000001600142c003995049025c6c3c84eb5376f4c1d2b92240d024730440220634a315b2df1538eee1f0e5e2230f7c80fdec9d184702212111830f0d34e855b02200b5b12261c10813f69403c0b1bd9ec0f24445bd63578b8ae58c60f2e1ccd204c0121031954c5405a3df5ff7eab0bb5f3f314daa9e97340bb19aa51fce80fbb9beb516400000000',
  vin: [
    {
      txid: '4ef97ded516593531a5ae8bf500ce2312e441262042c97aa020d2a298de02c55',
      sequence: 4294967295,
      addresses: ['bc1q9sqrn9gyjqjuds7gf66nwm6vr54eyfqdj86qxd'],
      value: '2000000',
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
      opReturn: 'OP_RETURN (-:BTC.BTC:10000)',
      scriptPubKey: {
        hex: '6a0f2d3a4254432e4254433a3130303030',
      },
    },
    {
      value: '1972359',
      n: 2,
      scriptPubKey: {
        hex: '00142c003995049025c6c3c84eb5376f4c1d2b92240d',
      },
      addresses: ['bc1q9sqrn9gyjqjuds7gf66nwm6vr54eyfqdj86qxd'],
    },
  ],
}

export default { tx }
