import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '6EF9BEEE00F83829D133812BF33C248111FAEBDE3787762A4E0208608C0CF8E9',
  blockHash: '7F0FDFF78662AEF18A52D82CDBB27E0E2FE702FD66125CAB271C8E1C8B6F12B5',
  blockHeight: 13759106,
  timestamp: 1701988659,
  confirmations: 739539,
  fee: {
    amount: '2000000',
    denom: 'rune',
  },
  gasUsed: '7964646',
  gasWanted: '0',
  index: 3,
  memo: '$-:BTC.BTC:bc1q9u8ayxpks5evgp4v9emcanzg95wtvy65ysnc2h',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'thor1282wnh8xetl6mje4yj7ng8mtzcy0g5nc6sgdjq',
      from: 'thor1282wnh8xetl6mje4yj7ng8mtzcy0g5nc6sgdjq',
      to: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      type: 'deposit',
      value: {
        amount: '875086696',
        denom: 'rune',
      },
    },
    {
      index: '0',
      origin: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      to: 'thor1282wnh8xetl6mje4yj7ng8mtzcy0g5nc6sgdjq',
      type: 'outbound',
      value: {
        amount: '873086696',
        denom: 'rune',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '873086696rune',
        receiver: 'thor1282wnh8xetl6mje4yj7ng8mtzcy0g5nc6sgdjq',
      },
      coin_spent: {
        amount: '873086696rune',
        spender: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      },
      fee: {
        coins: '2000000 THOR.RUNE',
        pool_deduct: '0',
        tx_id: '6EF9BEEE00F83829D133812BF33C248111FAEBDE3787762A4E0208608C0CF8E9',
      },
      message: {
        action: 'deposit',
        memo: '$-:BTC.BTC:bc1q9u8ayxpks5evgp4v9emcanzg95wtvy65ysnc2h',
        sender: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      },
      outbound: {
        chain: 'THOR',
        coin: '873086696 THOR.RUNE',
        from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
        id: '0000000000000000000000000000000000000000000000000000000000000000',
        in_tx_id: '6EF9BEEE00F83829D133812BF33C248111FAEBDE3787762A4E0208608C0CF8E9',
        memo: 'REFUND:6EF9BEEE00F83829D133812BF33C248111FAEBDE3787762A4E0208608C0CF8E9',
        to: 'thor1282wnh8xetl6mje4yj7ng8mtzcy0g5nc6sgdjq',
      },
      refund: {
        chain: 'THOR',
        code: '1',
        coin: '875086696 THOR.RUNE',
        from: 'thor1282wnh8xetl6mje4yj7ng8mtzcy0g5nc6sgdjq',
        id: '6EF9BEEE00F83829D133812BF33C248111FAEBDE3787762A4E0208608C0CF8E9',
        memo: '$-:BTC.BTC:bc1q9u8ayxpks5evgp4v9emcanzg95wtvy65ysnc2h',
        reason: 'loan contains no collateral to redeem',
        to: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      },
      transfer: {
        amount: '873086696rune',
        recipient: 'thor1282wnh8xetl6mje4yj7ng8mtzcy0g5nc6sgdjq',
        sender: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      },
    },
  },
}

export default { tx }
