export default {
  tx: {
    txid: '8136FF781B38919958249308CFABFD253CF371514661119BCD231875968BD06B',
    blockHash: 'D8186504233B8AD92ED2799D88A16A38F706889A99F1AEC49A6EA96EC94AE4E7',
    blockHeight: 9636923,
    timestamp: 1645207449,
    confirmations: 358801,
    fee: {
      amount: '6250',
      denom: 'uatom',
    },
    gasUsed: '151141',
    gasWanted: '250000',
    index: 7,
    value: '',
    messages: [
      {
        from: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
        to: 'cosmosvaloper1lzhlnpahvznwfv4jmay2tgaha5kmz5qxerarrl',
        origin: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
        type: 'delegate',
        value: {
          amount: '1920000',
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
              value: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
            },
            {
              key: 'amount',
              value: '78085uatom',
            },
            {
              key: 'receiver',
              value: 'cosmos1fl48vsnmsdzcv85q5d2q4z5ajdha8yu34mf0eh',
            },
            {
              key: 'amount',
              value: '1920000uatom',
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
              value: '78085uatom',
            },
            {
              key: 'spender',
              value: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
            },
            {
              key: 'amount',
              value: '1920000uatom',
            },
          ],
        },
        {
          type: 'delegate',
          attributes: [
            {
              key: 'validator',
              value: 'cosmosvaloper1lzhlnpahvznwfv4jmay2tgaha5kmz5qxerarrl',
            },
            {
              key: 'amount',
              value: '1920000uatom',
            },
            {
              key: 'new_shares',
              value: '1920000.000000000000000000',
            },
          ],
        },
        {
          type: 'message',
          attributes: [
            {
              key: 'action',
              value: '/cosmos.staking.v1beta1.MsgDelegate',
            },
            {
              key: 'sender',
              value: 'cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl',
            },
            {
              key: 'module',
              value: 'staking',
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
              value: '78085uatom',
            },
          ],
        },
      ],
    },
  },
}
