import type { Tx } from '../../../index'

const tx: Tx = {
  txid: 'AD3235CB5F42BB49784C56AD1B9737824674BEC468E4A7EB00E3555A2FDAA064',
  blockHash: '14351D0B0218D21DA8AD64FA5C717F717DF7B7062E8E9CBE211A0005104FBF54',
  blockHeight: 18848176,
  timestamp: 1706033616,
  confirmations: 85530,
  fee: {
    amount: '2281',
    denom: 'uatom',
  },
  gasUsed: '74410',
  gasWanted: '91213',
  index: 1,
  memo: '$-:BTC.BTC:bc1q7s6r03k7e7x2gthzmjk2fptx32ags78jk57cu4',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos1csjuyfe8tnyn5q5sgm3wxetfqkt9053at78n69',
      from: 'cosmos1csjuyfe8tnyn5q5sgm3wxetfqkt9053at78n69',
      to: 'cosmos1lwktkpjh3tvmlftfkaz9xukw7xzksh059eslkf',
      type: 'send',
      value: {
        amount: '45633513',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '45633513uatom',
        receiver: 'cosmos1lwktkpjh3tvmlftfkaz9xukw7xzksh059eslkf',
      },
      coin_spent: {
        amount: '45633513uatom',
        spender: 'cosmos1csjuyfe8tnyn5q5sgm3wxetfqkt9053at78n69',
      },
      message: {
        action: '/cosmos.bank.v1beta1.MsgSend',
        module: 'bank',
        sender: 'cosmos1csjuyfe8tnyn5q5sgm3wxetfqkt9053at78n69',
      },
      transfer: {
        amount: '45633513uatom',
        recipient: 'cosmos1lwktkpjh3tvmlftfkaz9xukw7xzksh059eslkf',
        sender: 'cosmos1csjuyfe8tnyn5q5sgm3wxetfqkt9053at78n69',
      },
    },
  },
}

export default { tx }
