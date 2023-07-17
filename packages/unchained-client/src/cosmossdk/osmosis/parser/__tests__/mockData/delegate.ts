import type { Tx } from '../../..'

const tx: Tx = {
  txid: 'CA915A263C5FF8265B0D244DADF45F3F66AB684DCC160637EDA6E5F5FEC999B8',
  blockHash: '08D633CD1D1E9576822394E4F94F644DCB20CBDA0B1764D11648FADFB1CAF05B',
  blockHeight: 5823208,
  timestamp: 1661965810,
  confirmations: 59,
  fee: {
    amount: '0',
    denom: 'uosmo',
  },
  gasUsed: '243137',
  gasWanted: '358242',
  index: 5,
  value: '',
  messages: [
    {
      index: '0',
      origin: 'osmo1t5nts8y096tezaspwzanpsw6dgdh32u8ehu72v',
      from: 'osmo1t5nts8y096tezaspwzanpsw6dgdh32u8ehu72v',
      to: 'osmovaloper1lzhlnpahvznwfv4jmay2tgaha5kmz5qxwmj9we',
      type: 'delegate',
      value: {
        amount: '22824',
        denom: 'uosmo',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '22824uosmo',
        receiver: 'osmo1fl48vsnmsdzcv85q5d2q4z5ajdha8yu3aq6l09',
      },
      coin_spent: {
        amount: '22824uosmo',
        spender: 'osmo1t5nts8y096tezaspwzanpsw6dgdh32u8ehu72v',
      },
      delegate: {
        amount: '22824uosmo',
        new_shares: '22824.000000000000000000',
        validator: 'osmovaloper1lzhlnpahvznwfv4jmay2tgaha5kmz5qxwmj9we',
      },
      message: {
        action: '/cosmos.staking.v1beta1.MsgDelegate',
        module: 'staking',
        sender: 'osmo1t5nts8y096tezaspwzanpsw6dgdh32u8ehu72v',
      },
      transfer: {
        amount: '15294uosmo',
        recipient: 'osmo1t5nts8y096tezaspwzanpsw6dgdh32u8ehu72v',
        sender: 'osmo1jv65s3grqf6v6jl3dp4t6c9t9rk99cd80yhvld',
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
