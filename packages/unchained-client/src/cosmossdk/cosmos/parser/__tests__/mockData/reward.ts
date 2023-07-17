import type { Tx } from '../../..'

const tx: Tx = {
  txid: 'E34AFB3A28198957040073034E16D4A979B403E672859651B41C207538136ABE',
  blockHash: 'DFFDB4B083138492721673E6754FAE5533C8D2D0AFC1928E959CDBB464E20864',
  blockHeight: 9636957,
  timestamp: 1646430088,
  confirmations: 2226945,
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
      index: '0',
      origin: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
      from: 'cosmosvaloper1hdrlqvyjfy5sdrseecjrutyws9khtxxaux62l7',
      to: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
      type: 'withdraw_delegator_reward',
      value: {
        amount: '39447',
        denom: 'uatom',
      },
    },
    {
      index: '1',
      origin: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
      from: 'cosmosvaloper1lzhlnpahvznwfv4jmay2tgaha5kmz5qxerarrl',
      to: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
      type: 'withdraw_delegator_reward',
      value: {
        amount: '7',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '39447uatom',
        receiver: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
      },
      coin_spent: {
        amount: '39447uatom',
        spender: 'cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl',
      },
      message: {
        action: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
        module: 'distribution',
        sender: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
      },
      transfer: {
        amount: '39447uatom',
        recipient: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
        sender: 'cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl',
      },
      withdraw_rewards: {
        amount: '39447uatom',
        validator: 'cosmosvaloper1hdrlqvyjfy5sdrseecjrutyws9khtxxaux62l7',
      },
    },
    '1': {
      coin_received: {
        amount: '7uatom',
        receiver: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
      },
      coin_spent: {
        amount: '7uatom',
        spender: 'cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl',
      },
      message: {
        action: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
        module: 'distribution',
        sender: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
      },
      transfer: {
        amount: '7uatom',
        recipient: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
        sender: 'cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl',
      },
      withdraw_rewards: {
        amount: '7uatom',
        validator: 'cosmosvaloper1lzhlnpahvznwfv4jmay2tgaha5kmz5qxerarrl',
      },
    },
  },
}

export default { tx }
