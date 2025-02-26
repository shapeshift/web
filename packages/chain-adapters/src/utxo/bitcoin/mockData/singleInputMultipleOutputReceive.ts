import type { utxo } from '@shapeshiftoss/unchained-client'

const account: utxo.bitcoin.Account = {
  pubkey: 'testKey',
  balance: '0',
  unconfirmedBalance: '0',
  addresses: [
    {
      balance: '0',
      pubkey: '1MJoEN3HLBRVR2anX6L95MRTpSuPNQHxTh',
    },
    {
      balance: '0',
      pubkey: '1LrmM2UyAsthKNE5VzNfKoTYmNZ2StD4vY',
    },
  ],
  nextReceiveAddressIndex: 0,
  nextChangeAddressIndex: 0,
}

const txHistory = {
  pubkey: 'testKey',
  txs: [
    {
      txid: '7c1ff165610f2bbf02e68d27b366b7c33ca8d561fe220a75622cb8c379bd6175',
      blockHash: '00000000000000000000b06530b072d2076b34575d45bcea4612dd11f0b89dfa',
      blockHeight: 825506,
      timestamp: 1705084793,
      confirmations: 9,
      value: '101835499',
      fee: '43716',
      hex: '01000000000101d4b144fd0ed129dff49ced11eb8894e9add2ace91dd2f10bb8f2d71f5ee4462b0000000000fdffffff0390b9eb05000000001600141c6977423aa4b82a0d7f8496cdf3fc2f8b4f580c3f291900000000001976a914dec02d9f6daa9fb3a464c4113147e1617281c32b88ac1c000d00000000001976a914d9d3ca224095471e4ff6f6334fc8a6642943872588ac02483045022100ce7b90c01207aaa060d2008201e492161a72cd3fa7a33a1b6c364a5d92998a6f0220215e89f870e7ef2f3eb7b45641d944fb6ee8c287c6733e65090847eba262f7ca012102084ad9ff2a070ef71f32375ff91e5f98448afc62bfb5934c3c15b4348cf11df700000000',
      vin: [
        {
          txid: '2b46e45e1fd7f2b80bf1d21de9acd2ade99488eb11ed9cf4df29d10efd44b1d4',
          sequence: 4294967293,
          addresses: ['bc1qr35hws365juz5rtlsjtvmulu97957kqvr3zpw3'],
          value: '101879215',
        },
      ],
      vout: [
        {
          value: '99334544',
          n: 0,
          scriptPubKey: {
            hex: '00141c6977423aa4b82a0d7f8496cdf3fc2f8b4f580c',
          },
          addresses: ['bc1qr35hws365juz5rtlsjtvmulu97957kqvr3zpw3'],
        },
        {
          value: '1648959',
          n: 1,
          scriptPubKey: {
            hex: '76a914dec02d9f6daa9fb3a464c4113147e1617281c32b88ac',
          },
          addresses: ['1MJoEN3HLBRVR2anX6L95MRTpSuPNQHxTh'],
        },
        {
          value: '851996',
          n: 2,
          scriptPubKey: {
            hex: '76a914d9d3ca224095471e4ff6f6334fc8a6642943872588ac',
          },
          addresses: ['1LrmM2UyAsthKNE5VzNfKoTYmNZ2StD4vY'],
        },
      ],
    },
  ],
}

const mockData = { account, txHistory }

// eslint-disable-next-line import/no-default-export
export default mockData
