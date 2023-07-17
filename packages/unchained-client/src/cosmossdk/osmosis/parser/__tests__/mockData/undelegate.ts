import type { Tx } from '../../../../types'

const tx: Tx = {
  txid: '5E08F036C071B6C34C84E2A32C107E1833846FB4FE75CBD78DAD8953EEE49D65',
  blockHash: '6A8B2CB7AC0D9C3B07897C330AA604C2FF00A7BDC7D6EA2D55257BB9B0A0B406',
  blockHeight: 5823776,
  timestamp: 1661969828,
  confirmations: 4,
  fee: {
    amount: '0',
    denom: 'uosmo',
  },
  gasUsed: '266106',
  gasWanted: '392889',
  index: 13,
  value: '',
  messages: [
    {
      index: '0',
      origin: 'osmo1cx8fvv8vhp5h354yhrs0emtrj92svucp803lwv',
      from: 'osmovaloper1t8qckan2yrygq7kl9apwhzfalwzgc2429p8f0s',
      to: 'osmo1cx8fvv8vhp5h354yhrs0emtrj92svucp803lwv',
      type: 'begin_unbonding',
      value: {
        amount: '526000000',
        denom: 'uosmo',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '526000000uosmo',
        receiver: 'osmo1tygms3xhhs3yv487phx3dw4a95jn7t7lfqxwe3',
      },
      coin_spent: {
        amount: '526000000uosmo',
        spender: 'osmo1fl48vsnmsdzcv85q5d2q4z5ajdha8yu3aq6l09',
      },
      message: {
        action: '/cosmos.staking.v1beta1.MsgUndelegate',
        module: 'staking',
        sender: 'osmo1cx8fvv8vhp5h354yhrs0emtrj92svucp803lwv',
      },
      transfer: {
        amount: '526000000uosmo',
        recipient: 'osmo1tygms3xhhs3yv487phx3dw4a95jn7t7lfqxwe3',
        sender: 'osmo1fl48vsnmsdzcv85q5d2q4z5ajdha8yu3aq6l09',
      },
      unbond: {
        amount: '526000000uosmo',
        completion_time: '2022-09-14T18:17:08Z',
        validator: 'osmovaloper1t8qckan2yrygq7kl9apwhzfalwzgc2429p8f0s',
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
