import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '565C1D3741A94929E2AE4267C23A42F9F6844D7F894BAC56A54533B33DE7BB0F',
  blockHash: '833F7AB8879B700E27D97ACA6F7C8544E65C0EAE49F3D89D4400A4D626CFC553',
  blockHeight: 14305477,
  timestamp: 1705461511,
  confirmations: 192918,
  fee: {
    amount: '2000000',
    denom: 'rune',
  },
  gasUsed: '4294000',
  gasWanted: '0',
  index: 2,
  memo: ' $-:ETH.ETH.ETH:thor1x3379v4xjyc5nlhs83j5zhfs5m948nk72u5uax',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'thor1x3379v4xjyc5nlhs83j5zhfs5m948nk72u5uax',
      from: 'thor1x3379v4xjyc5nlhs83j5zhfs5m948nk72u5uax',
      to: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      type: 'deposit',
      value: {
        amount: '20000000',
        denom: 'rune',
      },
    },
    {
      index: '0',
      origin: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      to: 'thor1x3379v4xjyc5nlhs83j5zhfs5m948nk72u5uax',
      type: 'outbound',
      value: {
        amount: '18000000',
        denom: 'rune',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '18000000rune',
        receiver: 'thor1x3379v4xjyc5nlhs83j5zhfs5m948nk72u5uax',
      },
      coin_spent: {
        amount: '18000000rune',
        spender: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      },
      fee: {
        coins: '2000000 THOR.RUNE',
        pool_deduct: '0',
        tx_id: '565C1D3741A94929E2AE4267C23A42F9F6844D7F894BAC56A54533B33DE7BB0F',
      },
      message: {
        action: 'deposit',
        memo: ' $-:ETH.ETH.ETH:thor1x3379v4xjyc5nlhs83j5zhfs5m948nk72u5uax',
        sender: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      },
      outbound: {
        chain: 'THOR',
        coin: '18000000 THOR.RUNE',
        from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
        id: '0000000000000000000000000000000000000000000000000000000000000000',
        in_tx_id: '565C1D3741A94929E2AE4267C23A42F9F6844D7F894BAC56A54533B33DE7BB0F',
        memo: 'REFUND:565C1D3741A94929E2AE4267C23A42F9F6844D7F894BAC56A54533B33DE7BB0F',
        to: 'thor1x3379v4xjyc5nlhs83j5zhfs5m948nk72u5uax',
      },
      refund: {
        chain: 'THOR',
        code: '105',
        coin: '20000000 THOR.RUNE',
        from: 'thor1x3379v4xjyc5nlhs83j5zhfs5m948nk72u5uax',
        id: '565C1D3741A94929E2AE4267C23A42F9F6844D7F894BAC56A54533B33DE7BB0F',
        memo: ' $-:ETH.ETH.ETH:thor1x3379v4xjyc5nlhs83j5zhfs5m948nk72u5uax',
        reason: 'invalid tx type:  $-',
        to: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      },
      transfer: {
        amount: '18000000rune',
        recipient: 'thor1x3379v4xjyc5nlhs83j5zhfs5m948nk72u5uax',
        sender: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      },
    },
  },
}

export default { tx }
