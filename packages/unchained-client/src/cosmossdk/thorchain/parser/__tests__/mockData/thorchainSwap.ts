import type { Tx } from '../../../index'

const tx: Tx = {
  txid: 'C8C35C83D5B5ACCB6D80F0EFA5D7DAD48EB015A6698C20AF2AD73B82182D8B6A',
  blockHash: '86465422931EEE67761B3DE8EB40293989F690FC8841885983334C6D89BA976F',
  blockHeight: 14483945,
  timestamp: 1706566771,
  confirmations: 131,
  fee: {
    amount: '2000000',
    denom: 'urune',
  },
  gasUsed: '4144385',
  gasWanted: '0',
  index: 5,
  value: '',
  messages: [
    {
      index: '0',
      origin: 'thor166n4w5039meulfa3p6ydg60ve6ueac7tlt0jws',
      from: 'thor166n4w5039meulfa3p6ydg60ve6ueac7tlt0jws',
      to: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      type: 'deposit',
      value: {
        amount: '41666000000',
        denom: 'rune',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '41666000000rune',
        receiver: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      },
      coin_spent: {
        amount: '41666000000rune',
        spender: 'thor166n4w5039meulfa3p6ydg60ve6ueac7tlt0jws',
      },
      message: {
        action: 'deposit',
        memo: 'SWAP:avax/avax:thor166n4w5039meulfa3p6ydg60ve6ueac7tlt0jws:5142676147',
        sender: 'thor166n4w5039meulfa3p6ydg60ve6ueac7tlt0jws',
      },
      transfer: {
        amount: '41666000000rune',
        recipient: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
        sender: 'thor166n4w5039meulfa3p6ydg60ve6ueac7tlt0jws',
      },
    },
  },
}

export default { tx }
