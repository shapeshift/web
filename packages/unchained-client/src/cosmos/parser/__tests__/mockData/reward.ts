export default {
  tx: {
    txid: 'E34AFB3A28198957040073034E16D4A979B403E672859651B41C207538136ABE',
    blockHash: 'DFFDB4B083138492721673E6754FAE5533C8D2D0AFC1928E959CDBB464E20864',
    blockHeight: 9636957,
    timestamp: 1646430088,
    confirmations: 229401,
    fee: {
      amount: '7000',
      denom: 'uatom',
    },
    gasUsed: '161819',
    gasWanted: '280000',
    index: 4,
    value: '',
    messages: [
      {
        origin: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
        from: 'cosmosvaloper1hdrlqvyjfy5sdrseecjrutyws9khtxxaux62l7',
        to: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
        type: 'withdraw_delegator_reward',
        value: {
          amount: '',
          denom: '',
        },
      },
      {
        origin: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
        from: 'cosmosvaloper1lzhlnpahvznwfv4jmay2tgaha5kmz5qxerarrl',
        to: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
        type: 'withdraw_delegator_reward',
        value: {
          amount: '',
          denom: '',
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
              value: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
            },
            {
              key: 'amount',
              value: '39447uatom',
            },
          ],
        },
        {
          type: 'coin_spent',
          attributes: [
            {
              key: 'spender',
              value: 'cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl',
            },
            {
              key: 'amount',
              value: '39447uatom',
            },
          ],
        },
        {
          type: 'message',
          attributes: [
            {
              key: 'action',
              value: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
            },
            {
              key: 'sender',
              value: 'cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl',
            },
            {
              key: 'module',
              value: 'distribution',
            },
            {
              key: 'sender',
              value: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
            },
          ],
        },
        {
          type: 'transfer',
          attributes: [
            {
              key: 'recipient',
              value: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
            },
            {
              key: 'sender',
              value: 'cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl',
            },
            {
              key: 'amount',
              value: '39447uatom',
            },
          ],
        },
        {
          type: 'withdraw_rewards',
          attributes: [
            {
              key: 'amount',
              value: '39447uatom',
            },
            {
              key: 'validator',
              value: 'cosmosvaloper1hdrlqvyjfy5sdrseecjrutyws9khtxxaux62l7',
            },
          ],
        },
      ],
      '1': [
        {
          type: 'coin_received',
          attributes: [
            {
              key: 'receiver',
              value: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
            },
            {
              key: 'amount',
              value: '7uatom',
            },
          ],
        },
        {
          type: 'coin_spent',
          attributes: [
            {
              key: 'spender',
              value: 'cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl',
            },
            {
              key: 'amount',
              value: '7uatom',
            },
          ],
        },
        {
          type: 'message',
          attributes: [
            {
              key: 'action',
              value: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
            },
            {
              key: 'sender',
              value: 'cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl',
            },
            {
              key: 'module',
              value: 'distribution',
            },
            {
              key: 'sender',
              value: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
            },
          ],
        },
        {
          type: 'transfer',
          attributes: [
            {
              key: 'recipient',
              value: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
            },
            {
              key: 'sender',
              value: 'cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl',
            },
            {
              key: 'amount',
              value: '7uatom',
            },
          ],
        },
        {
          type: 'withdraw_rewards',
          attributes: [
            {
              key: 'amount',
              value: '7uatom',
            },
            {
              key: 'validator',
              value: 'cosmosvaloper1lzhlnpahvznwfv4jmay2tgaha5kmz5qxerarrl',
            },
          ],
        },
      ],
    },
  },
}
