import type { Tx } from '../../../index'

const tx: Tx = {
  txid: 'D1337C9F207973DE6BDA5A94BF202158349CE625202D236CBE8151DC6957376F',
  blockHash: '4BF39770BB3B6B6626530388842A295AEC137F9EF3AEDE6C6ABCF9A8C49CB904',
  blockHeight: 14496094,
  timestamp: 1706641022,
  confirmations: 500,
  fee: {
    amount: '2000000',
    denom: 'rune',
  },
  gasUsed: '4159610',
  gasWanted: '0',
  index: 0,
  value: '',
  messages: [
    {
      index: '0',
      origin: 'thor197ssrutuncwptemfh3kxnwqm0hgpxery479tp0',
      from: 'thor197ssrutuncwptemfh3kxnwqm0hgpxery479tp0',
      to: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      type: 'deposit',
      value: {
        amount: '16000000000',
        denom: 'rune',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '16000000000rune',
        receiver: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      },
      coin_spent: {
        amount: '16000000000rune',
        spender: 'thor197ssrutuncwptemfh3kxnwqm0hgpxery479tp0',
      },
      message: {
        action: 'deposit',
        memo: '=:ETH.ETH:0xC7aF182e65EA4Bda6A455872FE4FDa5Df39C69D1:0/1/0:te:0',
        sender: 'thor197ssrutuncwptemfh3kxnwqm0hgpxery479tp0',
      },
      transfer: {
        amount: '16000000000rune',
        recipient: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
        sender: 'thor197ssrutuncwptemfh3kxnwqm0hgpxery479tp0',
      },
    },
  },
}

export default { tx }
