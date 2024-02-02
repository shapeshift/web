import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '867ACE440D890DB5788A6E36306411001ED3D0C9F8D12B67772810E2D6BBB772',
  blockHash: '623E26C96F9AFBCE3B5ED8B36124DD79468C5F4B161ECD0556822740DD96DB3E',
  blockHeight: 14414035,
  timestamp: 1706134633,
  confirmations: 84279,
  fee: {
    amount: '2000000',
    denom: 'rune',
  },
  gasUsed: '4015523',
  gasWanted: '0',
  index: 1,
  memo: '$-:ETH.ETH:0xae96d15537afa0cebc7792c8d4977de6cbf759c5',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'thor1x3379v4xjyc5nlhs83j5zhfs5m948nk72u5uax',
      from: 'thor1x3379v4xjyc5nlhs83j5zhfs5m948nk72u5uax',
      to: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      type: 'deposit',
      value: {
        amount: '200000000',
        denom: 'rune',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '200000000rune',
        receiver: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      },
      coin_spent: {
        amount: '200000000rune',
        spender: 'thor1x3379v4xjyc5nlhs83j5zhfs5m948nk72u5uax',
      },
      message: {
        action: 'deposit',
        memo: '$-:ETH.ETH:0xae96d15537afa0cebc7792c8d4977de6cbf759c5',
        sender: 'thor1x3379v4xjyc5nlhs83j5zhfs5m948nk72u5uax',
      },
      transfer: {
        amount: '200000000rune',
        recipient: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
        sender: 'thor1x3379v4xjyc5nlhs83j5zhfs5m948nk72u5uax',
      },
    },
  },
}

export default { tx }
