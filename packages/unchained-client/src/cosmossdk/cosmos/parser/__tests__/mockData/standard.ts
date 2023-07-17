import type { Tx } from '../../..'

const tx: Tx = {
  txid: '5E4DE0462EA7F140C122F12B92BEF09C55F430079FABBF426710847006EF1935',
  blockHash: 'E7EF67B3D9BD5727E23951E0195C928924D96AC5E2F820D6A3824B14F14456A6',
  blockHeight: 9473608,
  timestamp: 1645207449,
  confirmations: 2390171,
  fee: {
    amount: '2500',
    denom: 'uatom',
  },
  gasUsed: '62326',
  gasWanted: '85000',
  index: 3,
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos1t5u0jfg3ljsjrh2m9e47d4ny2hea7eehxrzdgd',
      from: 'cosmos1t5u0jfg3ljsjrh2m9e47d4ny2hea7eehxrzdgd',
      to: 'cosmos14e25lpsedq863vgweqg4m9n0z28c203kfdlzmz',
      type: 'send',
      value: {
        amount: '2002965',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '2002965uatom',
        receiver: 'cosmos14e25lpsedq863vgweqg4m9n0z28c203kfdlzmz',
      },
      coin_spent: {
        amount: '2002965uatom',
        spender: 'cosmos1t5u0jfg3ljsjrh2m9e47d4ny2hea7eehxrzdgd',
      },
      message: {
        action: '/cosmos.bank.v1beta1.MsgSend',
        module: 'bank',
        sender: 'cosmos1t5u0jfg3ljsjrh2m9e47d4ny2hea7eehxrzdgd',
      },
      transfer: {
        amount: '2002965uatom',
        recipient: 'cosmos14e25lpsedq863vgweqg4m9n0z28c203kfdlzmz',
        sender: 'cosmos1t5u0jfg3ljsjrh2m9e47d4ny2hea7eehxrzdgd',
      },
    },
  },
}

export default { tx }
