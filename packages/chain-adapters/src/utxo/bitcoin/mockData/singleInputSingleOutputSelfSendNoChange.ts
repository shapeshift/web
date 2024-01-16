import type { utxo } from '@shapeshiftoss/unchained-client'

const account: utxo.bitcoin.Account = {
  pubkey: 'testKey',
  balance: '0',
  unconfirmedBalance: '0',
  addresses: [
    {
      balance: '0',
      pubkey: 'bc1qrgug46lmgumeksd277x9tuy4fq2gajvzw3z06n',
    },
    {
      balance: '0',
      pubkey: 'bc1q694669rvzchjhtqgec77t2h25hsmh7kw33ywj3',
    },
  ],
  nextReceiveAddressIndex: 0,
  nextChangeAddressIndex: 0,
}

const txHistory = {
  pubkey: 'testKey',
  txs: [
    {
      txid: 'cfa569b2d73f46df12a7bff469a604e9338e182b4c4a0f7a147ce2936675f05a',
      blockHash: '00000000000000000003f9f96182c2a5ba48169cca319ff1ff4fd103add22759',
      blockHeight: 819800,
      timestamp: 1701733361,
      confirmations: 5728,
      value: '177347',
      fee: '26688',
      hex: '0100000000010172679e633d7bb4290872282cba3a610016495321e53922d01e995f3cdad8bbd40100000000ffffffff01c3b4020000000000160014d16bad146c162f2bac08ce3de5aaeaa5e1bbface02483045022100b38f9e32695712340223fa83a46e7c3ac1f8541e721811ea0e4bbe35271bd85d02207b9d7c0bb0d4f041c57b6d0b2a938f2edad7f93d8dde242a91cdd65d225a4016012103839f5a4ddcf64fa657c0b9bf44e814c82ba85ad8dada022e5666082d616a3beb00000000',
      vin: [
        {
          txid: 'd4bbd8da3c5f991ed02239e52153491600613aba2c28720829b47b3d639e6772',
          vout: '1',
          sequence: 4294967295,
          addresses: ['bc1qrgug46lmgumeksd277x9tuy4fq2gajvzw3z06n'],
          value: '204035',
        },
      ],
      vout: [
        {
          value: '177347',
          n: 0,
          scriptPubKey: {
            hex: '0014d16bad146c162f2bac08ce3de5aaeaa5e1bbface',
          },
          addresses: ['bc1q694669rvzchjhtqgec77t2h25hsmh7kw33ywj3'],
        },
      ],
    },
  ],
}

const mockData = { account, txHistory }

// eslint-disable-next-line import/no-default-export
export default mockData
