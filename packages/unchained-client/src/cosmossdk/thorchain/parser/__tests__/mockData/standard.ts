import type { Tx } from '../../../../types'

const tx: Tx = {
  txid: '197957198FF165A38455BDE2FBECE0879678CAA703BE3E83A5FC1153600551E4',
  blockHash: '5007EBF363C14CE90ACEA18A8BB5F4E3EA85DFE5664DD3861FF63CA3BAF78024',
  blockHeight: 7130915,
  timestamp: 1661978574,
  confirmations: 1087,
  fee: {
    amount: '0',
    denom: 'rune',
  },
  gasUsed: '85971',
  gasWanted: '5000000000',
  index: 0,
  value: '',
  messages: [
    {
      index: '0',
      origin: 'thor1n9cuafe8trfhw2e8gt7794zv9hfwk6gfmzllzc',
      from: 'thor1n9cuafe8trfhw2e8gt7794zv9hfwk6gfmzllzc',
      to: 'thor1279z3ld4a2qnxvt49m36gxu9ghspxxppz40kf6',
      type: 'send',
      value: {
        amount: '1551500000000',
        denom: 'rune',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '1551500000000rune',
        receiver: 'thor1279z3ld4a2qnxvt49m36gxu9ghspxxppz40kf6',
      },
      coin_spent: {
        amount: '1551500000000rune',
        spender: 'thor1n9cuafe8trfhw2e8gt7794zv9hfwk6gfmzllzc',
      },
      message: {
        action: 'send',
        module: 'governance',
        sender: 'thor1n9cuafe8trfhw2e8gt7794zv9hfwk6gfmzllzc',
      },
      transfer: {
        amount: '1551500000000rune',
        recipient: 'thor1279z3ld4a2qnxvt49m36gxu9ghspxxppz40kf6',
        sender: 'thor1n9cuafe8trfhw2e8gt7794zv9hfwk6gfmzllzc',
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
      denom: 'rune',
    },
  },
  txNoFee: tx,
}
