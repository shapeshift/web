import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '850C11A019F11DA405984D4413AA6E8BDF2140008D9C6A01F593CF26DF9AD372',
  blockHash: '8D2F962CEBD012F6DE4C3F6E1066BA04E205E7ECED09A0E50569576960ED3B79',
  blockHeight: 14486183,
  timestamp: 1706580505,
  confirmations: 11934,
  fee: {
    amount: '2000000',
    denom: 'rune',
  },
  gasUsed: '6778954',
  gasWanted: '0',
  index: 1,
  memo: '+:ETH.HOT-0X6C6EE5E31D828DE241282B9606C8E98EA48526E2::ss:0',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'thor1j5jxvwd33rz66r88vwwwayvncjadx9jy5hvvqw',
      from: 'thor1j5jxvwd33rz66r88vwwwayvncjadx9jy5hvvqw',
      to: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      type: 'deposit',
      value: {
        amount: '22026432',
        denom: 'rune',
      },
    },
    {
      index: '0',
      origin: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      to: 'thor1j5jxvwd33rz66r88vwwwayvncjadx9jy5hvvqw',
      type: 'outbound',
      value: {
        amount: '20026432',
        denom: 'rune',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '20026432rune',
        receiver: 'thor1j5jxvwd33rz66r88vwwwayvncjadx9jy5hvvqw',
      },
      coin_spent: {
        amount: '20026432rune',
        spender: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      },
      fee: {
        coins: '2000000 THOR.RUNE',
        pool_deduct: '0',
        tx_id: '850C11A019F11DA405984D4413AA6E8BDF2140008D9C6A01F593CF26DF9AD372',
      },
      message: {
        action: 'deposit',
        memo: '+:ETH.HOT-0X6C6EE5E31D828DE241282B9606C8E98EA48526E2::ss:0',
        sender: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      },
      outbound: {
        chain: 'THOR',
        coin: '20026432 THOR.RUNE',
        from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
        id: '0000000000000000000000000000000000000000000000000000000000000000',
        in_tx_id: '850C11A019F11DA405984D4413AA6E8BDF2140008D9C6A01F593CF26DF9AD372',
        memo: 'REFUND:850C11A019F11DA405984D4413AA6E8BDF2140008D9C6A01F593CF26DF9AD372',
        to: 'thor1j5jxvwd33rz66r88vwwwayvncjadx9jy5hvvqw',
      },
      refund: {
        chain: 'THOR',
        code: '1',
        coin: '22026432 THOR.RUNE',
        from: 'thor1j5jxvwd33rz66r88vwwwayvncjadx9jy5hvvqw',
        id: '850C11A019F11DA405984D4413AA6E8BDF2140008D9C6A01F593CF26DF9AD372',
        memo: '+:ETH.HOT-0X6C6EE5E31D828DE241282B9606C8E98EA48526E2::ss:0',
        reason:
          'add liquidity message fail validation: cannot add single sided liquidity while a pool is staged',
        to: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      },
      transfer: {
        amount: '20026432rune',
        recipient: 'thor1j5jxvwd33rz66r88vwwwayvncjadx9jy5hvvqw',
        sender: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      },
    },
  },
}

export default { tx }
