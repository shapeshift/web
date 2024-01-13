import type { utxo } from '@shapeshiftoss/unchained-client'

const account: utxo.bitcoin.Account = {
  pubkey: 'testKey',
  balance: '0',
  unconfirmedBalance: '0',
  addresses: [
    {
      balance: '0',
      pubkey: 'bc1qgx9p5sratw7xm54f7cwjgkzmkm8pnm58xnc00a',
    },
    {
      balance: '0',
      pubkey: 'bc1qe2n2sy9p9eapepktavmd5jzup9uz49l3wm78ur',
    },
  ],
  nextReceiveAddressIndex: 2,
  nextChangeAddressIndex: 3,
}

const txHistory = {
  pubkey: 'testKey',
  txs: [
    {
      txid: '3608630bae96350674249d03a5a5f42eeea704538bbc7251667a1ec60e3fcf1c',
      blockHash: '0000000000000000000358e54144103d90a4832602761941d0ed310766c0e278',
      blockHeight: 816753,
      timestamp: 1699981271,
      confirmations: 8620,
      value: '27508',
      fee: '30081',
      hex: '01000000000102d76ee31ce6ff67c6141d5bcbdf225d4d59a8a210c7a748af5e64a34b4cc9e9d20100000000ffffffffd76ee31ce6ff67c6141d5bcbdf225d4d59a8a210c7a748af5e64a34b4cc9e9d20000000000ffffffff01746b0000000000001976a91453b583e40ff7c74224233580829b421d5ad8aa7188ac02483045022100e692d68ebf3cfa142e4754f57c0a000f697610aa9a82a1b682061dfc71c878710220608e047b129fe7ac2697a800a33f11f7e66fbc185e5338e0b73ba1b91d29f42a0121037685fa0b8a210ad0cfcebb68b407653070436efc810c3c1d6407010ec188f7fe02483045022100c9223f4092f250e4d65aebff4886d8746594359ff8aa4076132869dbcab9379702206b9b05c1e286e068b68a7a8397452cf582ae2036a81ed3a30429ac200c438f3d012102fa2c7208b8c64f463298bd64da453168f64c01d32f5ba495d5867aa49fcd4afc00000000',
      vin: [
        {
          txid: 'd2e9c94c4ba3645eaf48a7c710a2a8594d5d22dfcb5b1d14c667ffe61ce36ed7',
          vout: '1',
          sequence: 4294967295,
          addresses: ['bc1qe2n2sy9p9eapepktavmd5jzup9uz49l3wm78ur'],
          value: '37589',
        },
        {
          txid: 'd2e9c94c4ba3645eaf48a7c710a2a8594d5d22dfcb5b1d14c667ffe61ce36ed7',
          sequence: 4294967295,
          addresses: ['bc1qgx9p5sratw7xm54f7cwjgkzmkm8pnm58xnc00a'],
          value: '20000',
        },
      ],
      vout: [
        {
          value: '27508',
          n: 0,
          scriptPubKey: {
            hex: '76a91453b583e40ff7c74224233580829b421d5ad8aa7188ac',
          },
          addresses: ['18dcXpWE2qZLNnbSa7z9RbPu618CfCSriL'],
        },
      ],
    },
  ],
}

const mockData = { account, txHistory }

// eslint-disable-next-line import/no-default-export
export default mockData
