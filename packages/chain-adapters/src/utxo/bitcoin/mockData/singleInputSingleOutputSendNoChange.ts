import type { utxo } from '@shapeshiftoss/unchained-client'

const account: utxo.bitcoin.Account = {
  pubkey: 'testKey',
  balance: '0',
  unconfirmedBalance: '0',
  addresses: [
    {
      balance: '0',
      pubkey: 'bc1q2eh0lqu8rerhqzrg8rq04wgxahvx6ly3vxuuqm',
    },
  ],
  nextReceiveAddressIndex: 0,
  nextChangeAddressIndex: 0,
}

const txHistory = {
  pubkey: 'testKey',
  txs: [
    {
      txid: 'dd63205adb6c2e03c43b1a0467f2b93ae321409ef2e8d9eb6512b145fd38fed5',
      blockHash: '00000000000000000000b06530b072d2076b34575d45bcea4612dd11f0b89dfa',
      blockHeight: 825506,
      timestamp: 1705084793,
      confirmations: 1,
      value: '29000',
      fee: '24736',
      hex: '02000000000101482487d5fd3089938647969a0ab518b0255bb0c964578a90863564bf303935b60100000000ffffffff01487100000000000022512006a7766edcc34d6fcc8a38b0493a6398f20388a4e5c18e721657354122558cfe024730440220589dfb1d52b5482a5daf93d4056fe02f29f48c886c9c70f5471ece8c0ea79a2c0220262bd280adbdbe46d152782c1adae9b0c62164af0a1f002159958879b9f3ef2601210304a713cc3c38e15fee1bcee496861e12a86b5e2ea575fd159795b0ad08ba56f500000000',
      vin: [
        {
          txid: 'b6353930bf643586908a5764c9b05b25b018b50a9a964786938930fdd5872448',
          vout: '1',
          sequence: 4294967295,
          addresses: ['bc1q2eh0lqu8rerhqzrg8rq04wgxahvx6ly3vxuuqm'],
          value: '53736',
        },
      ],
      vout: [
        {
          value: '29000',
          n: 0,
          scriptPubKey: {
            hex: '512006a7766edcc34d6fcc8a38b0493a6398f20388a4e5c18e721657354122558cfe',
          },
          addresses: ['bc1pq6nhvmkucdxklny28zcyjwnrnreq8z9yuhqcuusk2u65zgj43nlqclh8vp'],
        },
      ],
    },
  ],
}

const mockData = { account, txHistory }

// eslint-disable-next-line import/no-default-export
export default mockData
