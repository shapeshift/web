import type { Tx } from '../../..'

const tx: Tx = {
  txid: '09984D61B6BFFD66765E72D6BBD0AF4FEDBBFB8F43A1270F24BAE52853388425',
  blockHash: '931185AE6E53AC86033FB2BE71430BCAEB5A75EBAAD721CFDF1A5B1CE642E3AE',
  blockHeight: 5825391,
  timestamp: 1661979767,
  confirmations: 6,
  fee: {
    amount: '0',
    denom: 'uosmo',
  },
  gasUsed: '310504',
  gasWanted: '437126',
  index: 6,
  value: '',
  messages: [
    {
      index: '0',
      origin: 'osmo12lpmwhx9dvsz3tuftt2pfhv76743l0xacx2w00',
      from: 'osmovaloper1ej2es5fjztqjcd4pwa0zyvaevtjd2y5w37wr9t',
      to: 'osmovaloper16s96n9k9zztdgjy8q4qcxp4hn7ww98qk5wjn0s',
      type: 'begin_redelegate',
      value: {
        amount: '30000000',
        denom: 'uosmo',
      },
    },
  ],
  events: {
    '0': {
      message: {
        action: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
        module: 'staking',
        sender: 'osmo12lpmwhx9dvsz3tuftt2pfhv76743l0xacx2w00',
      },
      redelegate: {
        amount: '30000000uosmo',
        completion_time: '2022-09-14T21:02:47Z',
        destination_validator: 'osmovaloper16s96n9k9zztdgjy8q4qcxp4hn7ww98qk5wjn0s',
        source_validator: 'osmovaloper1ej2es5fjztqjcd4pwa0zyvaevtjd2y5w37wr9t',
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
