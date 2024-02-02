import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '9CD053EC7A1ADCA100F35847F5E730733E23CE210EEF0C6F72D4834D89993CE7',
  blockHash: 'B8D8256300BA41E81D18C98D7102978B08C9E1B534A9E69D77207773D26BC4EB',
  blockHeight: 18932729,
  timestamp: 1706554577,
  confirmations: 95,
  fee: {
    amount: '2000',
    denom: 'uatom',
  },
  gasUsed: '74739',
  gasWanted: '200000',
  index: 0,
  memo: 'SWAP:THOR.RUNE:thor166n4w5039meulfa3p6ydg60ve6ueac7tlt0jws:30984116284',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos1dnssyzyhnja28zdww2ffa6fcxaxwanguf7nmq7',
      from: 'cosmos1dnssyzyhnja28zdww2ffa6fcxaxwanguf7nmq7',
      to: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
      type: 'send',
      value: {
        amount: '140122500',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '140122500uatom',
        receiver: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
      },
      coin_spent: {
        amount: '140122500uatom',
        spender: 'cosmos1dnssyzyhnja28zdww2ffa6fcxaxwanguf7nmq7',
      },
      message: {
        action: '/cosmos.bank.v1beta1.MsgSend',
        module: 'bank',
        sender: 'cosmos1dnssyzyhnja28zdww2ffa6fcxaxwanguf7nmq7',
      },
      transfer: {
        amount: '140122500uatom',
        recipient: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
        sender: 'cosmos1dnssyzyhnja28zdww2ffa6fcxaxwanguf7nmq7',
      },
    },
  },
}

export default { tx }
