import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '9A2ECC67A98EBD78546B6C30E844BD776DE5C921B19BD47452E2BBB5CACE9575',
  blockHash: 'E703DE10442FF374DD82DFE7AC24B4F79ABD9D9D7C145627DE1EF27FB2DFB546',
  blockHeight: 18869720,
  timestamp: 1706166046,
  confirmations: 63652,
  fee: {
    amount: '10000',
    denom: 'uatom',
  },
  gasUsed: '74074',
  gasWanted: '1000000',
  index: 1,
  memo: '+:GAIA/ATOM::ss:0',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos12ddmphvtnv2raa3pla7afypt85kffnjlg5mt85',
      from: 'cosmos12ddmphvtnv2raa3pla7afypt85kffnjlg5mt85',
      to: 'cosmos1g7a7l9zp4h0vma5tqe5xnmvps3wyzumwel2j95',
      type: 'send',
      value: {
        amount: '4681875',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '4681875uatom',
        receiver: 'cosmos1g7a7l9zp4h0vma5tqe5xnmvps3wyzumwel2j95',
      },
      coin_spent: {
        amount: '4681875uatom',
        spender: 'cosmos12ddmphvtnv2raa3pla7afypt85kffnjlg5mt85',
      },
      message: {
        action: '/cosmos.bank.v1beta1.MsgSend',
        module: 'bank',
        sender: 'cosmos12ddmphvtnv2raa3pla7afypt85kffnjlg5mt85',
      },
      transfer: {
        amount: '4681875uatom',
        recipient: 'cosmos1g7a7l9zp4h0vma5tqe5xnmvps3wyzumwel2j95',
        sender: 'cosmos12ddmphvtnv2raa3pla7afypt85kffnjlg5mt85',
      },
    },
  },
}

export default { tx }
