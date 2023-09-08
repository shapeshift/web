import type { Tx } from '../../..'

const tx: Tx = {
  txid: '1795FE6ED7B5A8C5478CBDE27F35C8FB64FC6229B7B90FA47D4406AA2078BBAB',
  blockHash: '140D9DEC3087EA26248B60559D9C044F649749E4483E8E1F30143A8E47E7FFE8',
  blockHeight: 9636932,
  timestamp: 1646429915,
  confirmations: 2226912,
  fee: {
    amount: '6250',
    denom: 'uatom',
  },
  gasUsed: '159777',
  gasWanted: '250000',
  index: 8,
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
      from: 'cosmosvaloper1sjllsnramtg3ewxqwwrwjxfgc4n4ef9u2lcnj0',
      to: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
      type: 'begin_unbonding',
      value: {
        amount: '200000',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '200000uatom',
        receiver: 'cosmos1tygms3xhhs3yv487phx3dw4a95jn7t7lpm470r',
      },
      coin_spent: {
        amount: '200000uatom',
        spender: 'cosmos1fl48vsnmsdzcv85q5d2q4z5ajdha8yu34mf0eh',
      },
      message: {
        action: '/cosmos.staking.v1beta1.MsgUndelegate',
        module: 'staking',
        sender: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
      },
      transfer: {
        amount: '200000uatom',
        recipient: 'cosmos1tygms3xhhs3yv487phx3dw4a95jn7t7lpm470r',
        sender: 'cosmos1fl48vsnmsdzcv85q5d2q4z5ajdha8yu34mf0eh',
      },
      unbond: {
        amount: '200000uatom',
        completion_time: '2022-03-25T21:38:35Z',
        validator: 'cosmosvaloper1sjllsnramtg3ewxqwwrwjxfgc4n4ef9u2lcnj0',
      },
    },
  },
}

export default { tx }
