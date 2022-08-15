export default {
  tx: {
    txid: '1795FE6ED7B5A8C5478CBDE27F35C8FB64FC6229B7B90FA47D4406AA2078BBAB',
    blockHash: '140D9DEC3087EA26248B60559D9C044F649749E4483E8E1F30143A8E47E7FFE8',
    blockHeight: 9636932,
    timestamp: 1646429915,
    confirmations: 229191,
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
      '0': [
        {
          type: 'coin_received',
          attributes: [
            {
              key: 'receiver',
              value: 'cosmos1tygms3xhhs3yv487phx3dw4a95jn7t7lpm470r',
            },
            {
              key: 'amount',
              value: '200000uatom',
            },
          ],
        },
        {
          type: 'coin_spent',
          attributes: [
            {
              key: 'spender',
              value: 'cosmos1fl48vsnmsdzcv85q5d2q4z5ajdha8yu34mf0eh',
            },
            {
              key: 'amount',
              value: '200000uatom',
            },
          ],
        },
        {
          type: 'message',
          attributes: [
            {
              key: 'action',
              value: '/cosmos.staking.v1beta1.MsgUndelegate',
            },
            {
              key: 'sender',
              value: 'cosmos1fl48vsnmsdzcv85q5d2q4z5ajdha8yu34mf0eh',
            },
            {
              key: 'module',
              value: 'staking',
            },
            {
              key: 'sender',
              value: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
            },
          ],
        },
        {
          type: 'transfer',
          attributes: [
            {
              key: 'recipient',
              value: 'cosmos1tygms3xhhs3yv487phx3dw4a95jn7t7lpm470r',
            },
            {
              key: 'sender',
              value: 'cosmos1fl48vsnmsdzcv85q5d2q4z5ajdha8yu34mf0eh',
            },
            {
              key: 'amount',
              value: '200000uatom',
            },
          ],
        },
        {
          type: 'unbond',
          attributes: [
            {
              key: 'validator',
              value: 'cosmosvaloper1sjllsnramtg3ewxqwwrwjxfgc4n4ef9u2lcnj0',
            },
            {
              key: 'amount',
              value: '200000uatom',
            },
            {
              key: 'completion_time',
              value: '2022-03-25T21:38:35Z',
            },
          ],
        },
      ],
    },
  },
}
