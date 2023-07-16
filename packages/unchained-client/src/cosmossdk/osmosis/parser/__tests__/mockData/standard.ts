import type { Tx } from '../../../../types'

const tx: Tx = {
  txid: 'FD0F263ADF13615B529366AA83DFE60771CDC1D97AE76ACBC6F1C21CCC3E2421',
  blockHash: '1CAD19D371A2775AFC2009D06CC0D257761D4D594C93A68C9EA5F184C87E3386',
  blockHeight: 5823207,
  timestamp: 1661965799,
  confirmations: 6,
  gasUsed: '64166',
  gasWanted: '900001',
  index: 19,
  value: '',
  fee: {
    amount: '0',
    denom: 'uosmo',
  },
  messages: [
    {
      index: '0',
      origin: 'osmo1px2s26qyv9lz0ds5lswhu5wjx4e4k50rzf3n8s',
      from: 'osmo1px2s26qyv9lz0ds5lswhu5wjx4e4k50rzf3n8s',
      to: 'osmo1wce63e3czp0jq3qrxgrzkq28e3eqq4uquc85nw',
      type: 'send',
      value: {
        amount: '5876652',
        denom: 'uosmo',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '5876652uosmo',
        receiver: 'osmo1wce63e3czp0jq3qrxgrzkq28e3eqq4uquc85nw',
      },
      coin_spent: {
        amount: '5876652uosmo',
        spender: 'osmo1px2s26qyv9lz0ds5lswhu5wjx4e4k50rzf3n8s',
      },
      message: {
        action: '/cosmos.bank.v1beta1.MsgSend',
        module: 'bank',
        sender: 'osmo1px2s26qyv9lz0ds5lswhu5wjx4e4k50rzf3n8s',
      },
      transfer: {
        amount: '5876652uosmo',
        recipient: 'osmo1wce63e3czp0jq3qrxgrzkq28e3eqq4uquc85nw',
        sender: 'osmo1px2s26qyv9lz0ds5lswhu5wjx4e4k50rzf3n8s',
      },
    },
  },
}

export default {
  tx,
  txWithFee: {
    ...tx,
    fee: {
      amount: '12345',
      denom: 'uosmo',
    },
  },
  txNoFee: tx,
}
