import type { Tx } from '../../../index'

const tx: Tx = {
  txid: 'C50D512B4327FCC6BC4074CDA7A0A052CB845C4CFFDADB4C1410F2E731D13941',
  blockHash: '59B46FE075EA64F24D5196D857896762885EFA45DD619AB4E4FD2753EEE0FE13',
  blockHeight: 18932716,
  timestamp: 1706554491,
  confirmations: 258,
  fee: {
    amount: '466',
    denom: 'uatom',
  },
  gasUsed: '74579',
  gasWanted: '93047',
  index: 6,
  memo: '=:BNB.BNB:bnb1e75f8rzqlsrm3qepv4qh2ytp07ad6625at8nzg:0/1/0:te:0',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos1nz22stv03fcp29563jrgu2v56hd92l96wwystz',
      from: 'cosmos1nz22stv03fcp29563jrgu2v56hd92l96wwystz',
      to: 'cosmos1mkjaqql9a2la7z8xt2xg0w0m60002m579x2ycf',
      type: 'send',
      value: {
        amount: '402000000',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '402000000uatom',
        receiver: 'cosmos1mkjaqql9a2la7z8xt2xg0w0m60002m579x2ycf',
      },
      coin_spent: {
        amount: '402000000uatom',
        spender: 'cosmos1nz22stv03fcp29563jrgu2v56hd92l96wwystz',
      },
      message: {
        action: '/cosmos.bank.v1beta1.MsgSend',
        module: 'bank',
        sender: 'cosmos1nz22stv03fcp29563jrgu2v56hd92l96wwystz',
      },
      transfer: {
        amount: '402000000uatom',
        recipient: 'cosmos1mkjaqql9a2la7z8xt2xg0w0m60002m579x2ycf',
        sender: 'cosmos1nz22stv03fcp29563jrgu2v56hd92l96wwystz',
      },
    },
  },
}

export default { tx }
