import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '9CC88F44570077E658303D35878037D57225434C5BDE5BC9FD7BA59864690821',
  blockHash: 'AB893E816DD983478E4A0A37928E0C959C4D6FC1919266D343BB757601F479DA',
  blockHeight: 18928449,
  timestamp: 1706527538,
  confirmations: 5139,
  fee: {
    amount: '10000',
    denom: 'uatom',
  },
  gasUsed: '74072',
  gasWanted: '1000000',
  index: 9,
  memo: '+:GAIA.ATOM::ss:29',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos1a8l3srqyk5krvzhkt7cyzy52yxcght6322w2qy',
      from: 'cosmos1a8l3srqyk5krvzhkt7cyzy52yxcght6322w2qy',
      to: 'cosmos1ujd8p9lu265k982fq32j7ww2dndgeccvu6etfs',
      type: 'send',
      value: {
        amount: '100000',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '100000uatom',
        receiver: 'cosmos1ujd8p9lu265k982fq32j7ww2dndgeccvu6etfs',
      },
      coin_spent: {
        amount: '100000uatom',
        spender: 'cosmos1a8l3srqyk5krvzhkt7cyzy52yxcght6322w2qy',
      },
      message: {
        action: '/cosmos.bank.v1beta1.MsgSend',
        module: 'bank',
        sender: 'cosmos1a8l3srqyk5krvzhkt7cyzy52yxcght6322w2qy',
      },
      transfer: {
        amount: '100000uatom',
        recipient: 'cosmos1ujd8p9lu265k982fq32j7ww2dndgeccvu6etfs',
        sender: 'cosmos1a8l3srqyk5krvzhkt7cyzy52yxcght6322w2qy',
      },
    },
  },
}

export default { tx }
