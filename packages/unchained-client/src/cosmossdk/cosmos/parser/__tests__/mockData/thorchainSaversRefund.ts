import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '4FEE983EBD0FC6E14DB71816B09A92ABC21FDD883F703B449CB5BF52E6957049',
  blockHash: '929DB1D7189DF3296483C115A9D70DF607B48BBD72FC4A9726340908446B4CB3',
  blockHeight: 17888317,
  timestamp: 1700201484,
  confirmations: 1045207,
  fee: {
    amount: '4500',
    denom: 'uatom',
  },
  gasUsed: '76858',
  gasWanted: '200000',
  index: 5,
  memo: 'REFUND:44BC762D4D5A1BD3ED8D06EFADDD905CC05CB48FB233D88119EBC0FE7DF7A8F1',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos19ksklulcdweea750pr3dw70v0gulj6s5xwdlpp',
      from: 'cosmos19ksklulcdweea750pr3dw70v0gulj6s5xwdlpp',
      to: 'cosmos1yt49rwszuelyh0k9hl6kkq4kdn66aeqwxez6sc',
      type: 'send',
      value: {
        amount: '885148',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '885148uatom',
        receiver: 'cosmos1yt49rwszuelyh0k9hl6kkq4kdn66aeqwxez6sc',
      },
      coin_spent: {
        amount: '885148uatom',
        spender: 'cosmos19ksklulcdweea750pr3dw70v0gulj6s5xwdlpp',
      },
      message: {
        action: '/cosmos.bank.v1beta1.MsgSend',
        module: 'bank',
        sender: 'cosmos19ksklulcdweea750pr3dw70v0gulj6s5xwdlpp',
      },
      transfer: {
        amount: '885148uatom',
        recipient: 'cosmos1yt49rwszuelyh0k9hl6kkq4kdn66aeqwxez6sc',
        sender: 'cosmos19ksklulcdweea750pr3dw70v0gulj6s5xwdlpp',
      },
    },
  },
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1700196945106656767',
      height: '13476888',
      in: [
        {
          address: 'cosmos1yt49rwszuelyh0k9hl6kkq4kdn66aeqwxez6sc',
          coins: [
            {
              amount: '99000000',
              asset: 'GAIA.ATOM',
            },
          ],
          txID: '44BC762D4D5A1BD3ED8D06EFADDD905CC05CB48FB233D88119EBC0FE7DF7A8F1',
        },
      ],
      metadata: {
        refund: {
          affiliateAddress: '',
          affiliateFee: '0',
          memo: '+:GAIA/ATOM',
          networkFees: [
            {
              amount: '10035200',
              asset: 'GAIA.ATOM',
            },
          ],
          reason: 'observed inbound tx to an inactive vault',
        },
      },
      out: [
        {
          address: 'cosmos1yt49rwszuelyh0k9hl6kkq4kdn66aeqwxez6sc',
          coins: [
            {
              amount: '88514800',
              asset: 'GAIA.ATOM',
            },
          ],
          height: '13477635',
          txID: '4FEE983EBD0FC6E14DB71816B09A92ABC21FDD883F703B449CB5BF52E6957049',
        },
      ],
      pools: [],
      status: 'success',
      type: 'refund',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '134768881001750011',
    prevPageToken: '134768881001750011',
  },
}

export default { tx, actionsResponse }
