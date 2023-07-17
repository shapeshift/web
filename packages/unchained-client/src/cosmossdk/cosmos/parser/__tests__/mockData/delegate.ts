import type { Tx } from '../../..'

const tx: Tx = {
  txid: '8136FF781B38919958249308CFABFD253CF371514661119BCD231875968BD06B',
  blockHash: 'D8186504233B8AD92ED2799D88A16A38F706889A99F1AEC49A6EA96EC94AE4E7',
  blockHeight: 9636923,
  timestamp: 1646429842,
  confirmations: 2226870,
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
      index: '0',
      origin: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
      from: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
      to: 'cosmosvaloper1lzhlnpahvznwfv4jmay2tgaha5kmz5qxerarrl',
      type: 'delegate',
      value: {
        amount: '1920000',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '1920000uatom',
        receiver: 'cosmos1fl48vsnmsdzcv85q5d2q4z5ajdha8yu34mf0eh',
      },
      coin_spent: {
        amount: '1920000uatom',
        spender: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
      },
      delegate: {
        amount: '1920000uatom',
        new_shares: '1920000.000000000000000000',
        validator: 'cosmosvaloper1lzhlnpahvznwfv4jmay2tgaha5kmz5qxerarrl',
      },
      message: {
        action: '/cosmos.staking.v1beta1.MsgDelegate',
        module: 'staking',
        sender: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
      },
      transfer: {
        amount: '78085uatom',
        recipient: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
        sender: 'cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl',
      },
    },
  },
}

export default { tx }
