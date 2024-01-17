import type { utxo } from '@shapeshiftoss/unchained-client'

const account: utxo.bitcoin.Account = {
  pubkey: 'testKey',
  balance: '0',
  unconfirmedBalance: '0',
  addresses: [
    {
      balance: '0',
      pubkey: 'bc1qnd7dwpefxtyajcf083hsa2jyt4064ujckuudw7',
    },
    {
      balance: '0',
      pubkey: 'bc1q4rdl57tx0erk3fmcenex3xf3u0lsa9zy5henaj',
    },
  ],
  nextReceiveAddressIndex: 0,
  nextChangeAddressIndex: 0,
}

const txHistory = {
  pubkey: 'testKey',
  txs: [
    {
      txid: '52904f79e7f3e817feda210687597a28c37f8b1aeb2e972f4876d82cecf9edc5',
      blockHash: '00000000000000000000b06530b072d2076b34575d45bcea4612dd11f0b89dfa',
      blockHeight: 825506,
      timestamp: 1705084793,
      confirmations: 3,
      value: '3330841',
      fee: '29610',
      hex: '010000000001014a81d8aeca1168f474cdd29ac888be2df253f8326ee2f73cc78f1a387f4210240100000000ffffffff02b907070000000000160014a8dbfa79667e4768a778ccf2689931e3ff0e944460cb2b00000000001600149b7cd7072932c9d9612f3c6f0eaa445d5faaf25802483045022100bcae6d4f314c3177c492d8006293bdfce99f2d94ec32f2e2ae5d849f46505aaa02206a1ca649b777f4c63692d38e9da92ec2064d66d427bec6968f365947177251b0012103e4a594cfaa5558c1e6180bb8d0c9cd0fd5d8403cc2d35155e41fa916781f9afa00000000',
      vin: [
        {
          txid: '2410427f381a8fc73cf7e26e32f853f22dbe88c89ad2cd74f46811caaed8814a',
          vout: '1',
          sequence: 4294967295,
          addresses: ['bc1qnd7dwpefxtyajcf083hsa2jyt4064ujckuudw7'],
          value: '3360451',
        },
      ],
      vout: [
        {
          value: '460729',
          n: 0,
          scriptPubKey: {
            hex: '0014a8dbfa79667e4768a778ccf2689931e3ff0e9444',
          },
          addresses: ['bc1q4rdl57tx0erk3fmcenex3xf3u0lsa9zy5henaj'],
        },
        {
          value: '2870112',
          n: 1,
          scriptPubKey: {
            hex: '00149b7cd7072932c9d9612f3c6f0eaa445d5faaf258',
          },
          addresses: ['bc1qnd7dwpefxtyajcf083hsa2jyt4064ujckuudw7'],
        },
      ],
    },
  ],
}

const mockData = { account, txHistory }

// eslint-disable-next-line import/no-default-export
export default mockData
