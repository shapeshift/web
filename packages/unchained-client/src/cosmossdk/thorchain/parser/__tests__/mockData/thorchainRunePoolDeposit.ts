import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '59D7472B6E9B30AEB3B99D2C0F95CC86EC680AE61F20E1E60D79839A7181989B',
  blockHash: 'FC8D01330732672D63355141DD4E8D83808DAEBE757B400FA9C65D14BDD73029',
  blockHeight: 18731307,
  timestamp: 1732547788,
  confirmations: 1672,
  fee: {
    amount: '2000000',
    denom: 'rune',
  },
  gasUsed: '472720',
  gasWanted: '0',
  index: 33,
  memo: 'POOL+',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'thor125dwsa39yeylqc7pn59l079dur502nsleyrgup',
      from: 'thor125dwsa39yeylqc7pn59l079dur502nsleyrgup',
      to: 'thor1dheycdevq39qlkxs2a6wuuzyn4aqxhve4qxtxt',
      type: 'deposit',
      value: {
        amount: '10000000',
        denom: 'rune',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '10000000rune',
        receiver: 'thor1dheycdevq39qlkxs2a6wuuzyn4aqxhve4qxtxt',
      },
      coin_spent: {
        amount: '10000000rune',
        spender: 'thor1rzqfv62dzu585607s5awqtgnvvwz5rzhdtv772',
      },
      message: {
        action: 'deposit',
        memo: 'POOL+',
        sender: 'thor1rzqfv62dzu585607s5awqtgnvvwz5rzhdtv772',
      },
      rune_pool_deposit: {
        rune_address: 'thor125dwsa39yeylqc7pn59l079dur502nsleyrgup',
        rune_amount: '10000000',
        tx_id: '59D7472B6E9B30AEB3B99D2C0F95CC86EC680AE61F20E1E60D79839A7181989B',
        units: '9290329',
      },
      transfer: {
        amount: '10000000rune',
        recipient: 'thor1dheycdevq39qlkxs2a6wuuzyn4aqxhve4qxtxt',
        sender: 'thor1rzqfv62dzu585607s5awqtgnvvwz5rzhdtv772',
      },
    },
  },
}

export default { tx }
