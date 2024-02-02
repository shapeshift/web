import type { Tx } from '../../../index'

const tx: Tx = {
  txid: 'DAC3EFA2FEDEB024C360D3D417938B95BCDF83C0E5D85E63797D013153E4AFBA',
  blockHash: 'B7D689AB9BC5201706B4D50AE281A2260402FFA206014758AC7E1E428A8C6A01',
  blockHeight: 14495797,
  timestamp: 1706639210,
  confirmations: 926,
  fee: {
    amount: '2000000',
    denom: 'rune',
  },
  gasUsed: '6524651',
  gasWanted: '0',
  index: 50,
  memo: '+:BSC.BNB:0x8e247cba845e3565f0c0707e4de049043e29c34e:wr:100',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'thor1h69n79u4ykwjc5z7m68yncc83vuky8t4t69rlh',
      from: 'thor1h69n79u4ykwjc5z7m68yncc83vuky8t4t69rlh',
      to: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      type: 'deposit',
      value: {
        amount: '19790527128',
        denom: 'rune',
      },
    },
  ],
  events: {
    '0': {
      add_liquidity: {
        THOR_txid: 'DAC3EFA2FEDEB024C360D3D417938B95BCDF83C0E5D85E63797D013153E4AFBA',
        asset_address: '',
        asset_amount: '0',
        liquidity_provider_units: '14674380',
        pool: 'BSC.BNB',
        rune_address: 'thor1a427q3v96psuj4fnughdw8glt5r7j38lj7rkp8',
        rune_amount: '197905271',
      },
      coin_received: {
        amount: '19790527128rune',
        receiver: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      },
      coin_spent: {
        amount: '19790527128rune',
        spender: 'thor1h69n79u4ykwjc5z7m68yncc83vuky8t4t69rlh',
      },
      message: {
        action: 'deposit',
        memo: '+:BSC.BNB:0x8e247cba845e3565f0c0707e4de049043e29c34e:wr:100',
        sender: 'thor1h69n79u4ykwjc5z7m68yncc83vuky8t4t69rlh',
      },
      pending_liquidity: {
        THOR_txid: 'DAC3EFA2FEDEB024C360D3D417938B95BCDF83C0E5D85E63797D013153E4AFBA',
        asset_address: '0x8e247cba845e3565f0c0707e4de049043e29c34e',
        asset_amount: '0',
        pool: 'BSC.BNB',
        rune_address: 'thor1h69n79u4ykwjc5z7m68yncc83vuky8t4t69rlh',
        rune_amount: '19592621857',
        type: 'add',
      },
      transfer: {
        amount: '19790527128rune',
        recipient: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
        sender: 'thor1h69n79u4ykwjc5z7m68yncc83vuky8t4t69rlh',
      },
    },
  },
}

export default { tx }
