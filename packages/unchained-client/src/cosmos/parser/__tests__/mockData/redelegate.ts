export default {
  tx: {
    txid: 'A69531AE72161D6556CEE744D5D6B3D0661443FA66C89360F40EC75CF7E278CA',
    blockHash: 'C3B387CF51B0957D52A79CF5EB4E50665661AC9528C6A65501EB45DA3D3A4A49',
    blockHeight: 9636911,
    timestamp: 1646429755,
    confirmations: 229341,
    fee: {
      amount: '6250',
      denom: 'uatom',
    },
    gasUsed: '204950',
    gasWanted: '250000',
    index: 5,
    value: '',
    messages: [
      {
        origin: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
        from: 'cosmosvaloper1sjllsnramtg3ewxqwwrwjxfgc4n4ef9u2lcnj0',
        to: 'cosmosvaloper156gqf9837u7d4c4678yt3rl4ls9c5vuursrrzf',
        type: 'begin_redelegate',
        value: {
          amount: '500000',
          denom: 'uatom',
        },
      },
    ],
    events: {
      '0': [
        {
          type: 'message',
          attributes: [
            {
              key: 'action',
              value: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
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
          type: 'redelegate',
          attributes: [
            {
              key: 'source_validator',
              value: 'cosmosvaloper1sjllsnramtg3ewxqwwrwjxfgc4n4ef9u2lcnj0',
            },
            {
              key: 'destination_validator',
              value: 'cosmosvaloper156gqf9837u7d4c4678yt3rl4ls9c5vuursrrzf',
            },
            {
              key: 'amount',
              value: '500000uatom',
            },
            {
              key: 'completion_time',
              value: '2022-03-25T21:35:55Z',
            },
          ],
        },
      ],
    },
  },
}
