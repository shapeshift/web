import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '31FAF7A2CFA034F6E6430A632955AC5979ED1BE356951B9BA5377BDE51C9E49A',
  blockHash: '6F1114B9799505247E41898DA7808283C99497077D98D43D6C1FFC6324AFF46F',
  blockHeight: 20996950,
  timestamp: 1746476483,
  confirmations: 876,
  fee: {
    amount: '2000000',
    denom: 'rune',
  },
  gasUsed: '106287',
  gasWanted: '-1',
  index: 0,
  memo: 'tcy-:1000',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'thor125dwsa39yeylqc7pn59l079dur502nsleyrgup',
      from: 'thor125dwsa39yeylqc7pn59l079dur502nsleyrgup',
      to: 'thor125dwsa39yeylqc7pn59l079dur502nsleyrgup',
      type: 'deposit',
      value: {
        amount: '0',
        denom: 'rune',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '1207741513tcy',
        receiver: 'thor125dwsa39yeylqc7pn59l079dur502nsleyrgup',
      },
      coin_spent: {
        amount: '1207741513tcy',
        spender: 'thor128a8hqnkaxyqv7qwajpggmfyudh64jl3c32vyv',
      },
      message: {
        action: '/types.MsgDeposit',
        memo: 'tcy-:1000',
        module: 'MsgDeposit',
        sender: 'thor125dwsa39yeylqc7pn59l079dur502nsleyrgup',
      },
      tcy_unstake: {
        address: 'thor125dwsa39yeylqc7pn59l079dur502nsleyrgup',
        amount: '1207741513',
      },
      transfer: {
        amount: '1207741513tcy',
        recipient: 'thor125dwsa39yeylqc7pn59l079dur502nsleyrgup',
        sender: 'thor128a8hqnkaxyqv7qwajpggmfyudh64jl3c32vyv',
      },
    },
  },
}

export default { tx }
