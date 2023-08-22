import type { Tx } from '../../..'

const tx: Tx = {
  txid: '8FDA7487156AE4A8BBDEAE90D182BE3689AFCB284A476188627285429581733E',
  blockHash: '1A4346947E81A97C5C14E45AB29804A8E0528D58D30A85FB9030DE4146890634',
  blockHeight: 5824875,
  timestamp: 1661976594,
  confirmations: 7,
  fee: {
    amount: '0',
    denom: 'uosmo',
  },
  gasUsed: '355432',
  gasWanted: '504522',
  index: 7,
  value: '',
  messages: [
    {
      index: '0',
      origin: 'osmo1jgsskpq4hng3ykjp64ywxqcp4kwke5a8x9jjym',
      from: 'osmovaloper12zwq8pcmmgwsl95rueqsf65avfg5zcj047ucw6',
      to: 'osmo1jgsskpq4hng3ykjp64ywxqcp4kwke5a8x9jjym',
      type: 'withdraw_delegator_reward',
      value: {
        amount: '273799',
        denom: 'uosmo',
      },
    },
    {
      index: '1',
      origin: 'osmo1jgsskpq4hng3ykjp64ywxqcp4kwke5a8x9jjym',
      from: 'osmovaloper12rzd5qr2wmpseypvkjl0spusts0eruw2g35lkn',
      to: 'osmo1jgsskpq4hng3ykjp64ywxqcp4kwke5a8x9jjym',
      type: 'withdraw_delegator_reward',
      value: {
        amount: '273799',
        denom: 'uosmo',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '273799uosmo',
        receiver: 'osmo1jgsskpq4hng3ykjp64ywxqcp4kwke5a8x9jjym',
      },
      coin_spent: {
        amount: '273799uosmo',
        spender: 'osmo1jv65s3grqf6v6jl3dp4t6c9t9rk99cd80yhvld',
      },
      message: {
        action: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
        module: 'distribution',
        sender: 'osmo1jgsskpq4hng3ykjp64ywxqcp4kwke5a8x9jjym',
      },
      transfer: {
        amount: '273799uosmo',
        recipient: 'osmo1jgsskpq4hng3ykjp64ywxqcp4kwke5a8x9jjym',
        sender: 'osmo1jv65s3grqf6v6jl3dp4t6c9t9rk99cd80yhvld',
      },
      withdraw_rewards: {
        amount: '273799uosmo',
        validator: 'osmovaloper12zwq8pcmmgwsl95rueqsf65avfg5zcj047ucw6',
      },
    },
    '1': {
      coin_received: {
        amount: '273799uosmo',
        receiver: 'osmo1jgsskpq4hng3ykjp64ywxqcp4kwke5a8x9jjym',
      },
      coin_spent: {
        amount: '273799uosmo',
        spender: 'osmo1jv65s3grqf6v6jl3dp4t6c9t9rk99cd80yhvld',
      },
      message: {
        action: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
        module: 'distribution',
        sender: 'osmo1jgsskpq4hng3ykjp64ywxqcp4kwke5a8x9jjym',
      },
      transfer: {
        amount: '273799uosmo',
        recipient: 'osmo1jgsskpq4hng3ykjp64ywxqcp4kwke5a8x9jjym',
        sender: 'osmo1jv65s3grqf6v6jl3dp4t6c9t9rk99cd80yhvld',
      },
      withdraw_rewards: {
        amount: '273799uosmo',
        validator: 'osmovaloper12rzd5qr2wmpseypvkjl0spusts0eruw2g35lkn',
      },
    },
  },
}

export default {
  tx,
  txNoFee: tx,
  txWithFee: {
    ...tx,
    fee: {
      amount: '12345',
      denom: 'uosmo',
    },
  },
}
