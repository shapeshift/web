import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '9cddfc4cda88eca0f48ad36cd6501cf72812a81d1eeab1d036d1902d2548d8d1',
  blockHash: '00000000000000000003a3927282def3cb9333d27a3e57fb796b7b98f1051cb1',
  blockHeight: 825042,
  timestamp: 1704828477,
  confirmations: 13,
  value: '17468053',
  fee: '26058',
  hex: '02000000000101264cf01b97ce5cd0ed4ea30f1b8830d2be9acb07f065c7ddcef3556c2c2f89160000000000ffffffff02958a0a010000000016001427fce96d5f6a72244e56563c7eb41fb79ac5ecf00000000000000000106a0e2b3a4254432f4254433a3a743a3002483045022100d0266a22bdbdbf7ddcbadc422c463b60be63ea3a36ddb0ab165c6de1426f233b022049c5cb9d2689ab48b7d178c26f00c17ff218bd79b79e1f8e176177ba554f456701210375623ef548ac5d93c2f6fea1da4ec28e39d06f0c65b21c9acf389f54d650699400000000',
  vin: [
    {
      txid: '16892f2c6c55f3ceddc765f007cb9abed230881b0fa34eedd05cce971bf04c26',
      sequence: 4294967295,
      addresses: ['bc1qqfcte3j9jgaa7p3uxr6fntqpad269vv2wvmzss'],
      value: '17494111',
    },
  ],
  vout: [
    {
      value: '17468053',
      n: 0,
      scriptPubKey: {
        hex: '001427fce96d5f6a72244e56563c7eb41fb79ac5ecf0',
      },
      addresses: ['bc1qyl7wjm2ldfezgnjk2c78adqlk7dvtm8sd7gn0q'],
    },
    {
      value: '0',
      n: 1,
      opReturn: 'OP_RETURN (+:BTC/BTC::t:0)',
      scriptPubKey: {
        hex: '6a0e2b3a4254432f4254433a3a743a30',
      },
    },
  ],
}

export default { tx }
