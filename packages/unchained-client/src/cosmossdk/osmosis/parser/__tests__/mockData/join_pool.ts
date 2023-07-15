import type { Tx } from '../../..'

// https://www.mintscan.io/osmosis/txs/AA58EDA8D4E86F1E532F1FEC4D4F1C645050DBF1261BAA607B74A9E92B2F17E3

const tx: Tx = {
  txid: 'AA58EDA8D4E86F1E532F1FEC4D4F1C645050DBF1261BAA607B74A9E92B2F17E3',
  blockHash: '1F88BA509C56E31E608E005E9576C4CB07ADBFC4461628E46792029437747806',
  blockHeight: 7976741,
  timestamp: 1674713538,
  confirmations: 71114,
  fee: {
    amount: '0',
    denom: 'uosmo',
  },
  gasUsed: '122454',
  gasWanted: '240000',
  index: 4,
  value: '',
  messages: [
    {
      index: '0',
      origin: 'osmo1sa6w2c3glhnrfmgjklh9j7r54en2ng9yj6zewu',
      from: 'osmo1sa6w2c3glhnrfmgjklh9j7r54en2ng9yj6zewu',
      to: '',
      type: 'join_pool',
      value: {
        amount: '4996551',
        denom: 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
      },
    },
    {
      index: '0',
      origin: 'osmo1sa6w2c3glhnrfmgjklh9j7r54en2ng9yj6zewu',
      from: 'osmo1sa6w2c3glhnrfmgjklh9j7r54en2ng9yj6zewu',
      to: '',
      type: 'join_pool',
      value: {
        amount: '69000357',
        denom: 'uosmo',
      },
    },
    {
      index: '0',
      origin: 'osmo1sa6w2c3glhnrfmgjklh9j7r54en2ng9yj6zewu',
      from: 'osmo1c9y7crgg6y9pfkq0y8mqzknqz84c3etr0kpcvj',
      to: 'osmo1sa6w2c3glhnrfmgjklh9j7r54en2ng9yj6zewu',
      type: 'join_pool',
      value: {
        amount: '492310218978494996725',
        denom: 'gamm/pool/1',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '492310218978494996725gamm/pool/1',
        receiver: 'osmo1sa6w2c3glhnrfmgjklh9j7r54en2ng9yj6zewu',
      },
      coin_spent: {
        amount: '492310218978494996725gamm/pool/1',
        spender: 'osmo1c9y7crgg6y9pfkq0y8mqzknqz84c3etr0kpcvj',
      },
      coinbase: {
        amount: '492310218978494996725gamm/pool/1',
        minter: 'osmo1c9y7crgg6y9pfkq0y8mqzknqz84c3etr0kpcvj',
      },
      message: {
        action: '/osmosis.gamm.v1beta1.MsgJoinPool',
        module: 'gamm',
        sender: 'osmo1sa6w2c3glhnrfmgjklh9j7r54en2ng9yj6zewu',
      },
      pool_joined: {
        module: 'gamm',
        pool_id: '1',
        sender: 'osmo1sa6w2c3glhnrfmgjklh9j7r54en2ng9yj6zewu',
        tokens_in:
          '4996551ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2,69000357uosmo',
      },
      transfer: {
        amount: '492310218978494996725gamm/pool/1',
        recipient: 'osmo1sa6w2c3glhnrfmgjklh9j7r54en2ng9yj6zewu',
        sender: 'osmo1c9y7crgg6y9pfkq0y8mqzknqz84c3etr0kpcvj',
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
