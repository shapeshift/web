import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '1A958641BB080AC625AF305421DA910D18433F1F90EA95DF1EDC8E7E4F59009F',
  blockHash: '2D91896E55057C1F2465626F6A0CA6C9C19672A96F951A0AA013146CDF7C1807',
  blockHeight: 20997540,
  timestamp: 1746480288,
  confirmations: 113,
  fee: {
    amount: '2000000',
    denom: 'rune',
  },
  gasUsed: '106772',
  gasWanted: '-1',
  index: 18,
  memo: 'tcy+',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'thor1s7naj6kzxpudy64zka8h5w7uffnzmhzluwtz83',
      from: 'thor1s7naj6kzxpudy64zka8h5w7uffnzmhzluwtz83',
      to: '',
      type: 'deposit',
      value: {
        amount: '271800000000',
        denom: 'tcy',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '271800000000tcy',
        receiver: 'thor128a8hqnkaxyqv7qwajpggmfyudh64jl3c32vyv',
      },
      coin_spent: {
        amount: '271800000000tcy',
        spender: 'thor1s7naj6kzxpudy64zka8h5w7uffnzmhzluwtz83',
      },
      message: {
        action: '/types.MsgDeposit',
        memo: 'tcy+',
        module: 'MsgDeposit',
        sender: 'thor1s7naj6kzxpudy64zka8h5w7uffnzmhzluwtz83',
      },
      tcy_stake: {
        address: 'thor1s7naj6kzxpudy64zka8h5w7uffnzmhzluwtz83',
        amount: '271800000000',
      },
      transfer: {
        amount: '271800000000tcy',
        recipient: 'thor128a8hqnkaxyqv7qwajpggmfyudh64jl3c32vyv',
        sender: 'thor1s7naj6kzxpudy64zka8h5w7uffnzmhzluwtz83',
      },
    },
  },
}

export default { tx }
