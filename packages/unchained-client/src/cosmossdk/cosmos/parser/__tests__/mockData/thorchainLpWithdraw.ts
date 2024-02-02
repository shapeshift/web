import type { Tx } from '../../../index'

const tx: Tx = {
  txid: 'E8C9E5708C60F1C17AB106851EB19B0BF8A888A5FA0E079B7DFC7DBDB8B2E21D',
  blockHash: '26B3EC09B183D9E669564B938CD861EB58F399C4C9C719DCA65752252B595A54',
  blockHeight: 18869800,
  timestamp: 1706166527,
  confirmations: 63812,
  fee: {
    amount: '2491',
    denom: 'uatom',
  },
  gasUsed: '73935',
  gasWanted: '90568',
  index: 0,
  memo: '-:GAIA.ATOM:10000',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos18377m4dkzz9exa6yctph0fu9ygsexgjvfy893w',
      from: 'cosmos18377m4dkzz9exa6yctph0fu9ygsexgjvfy893w',
      to: 'cosmos1g7a7l9zp4h0vma5tqe5xnmvps3wyzumwel2j95',
      type: 'send',
      value: {
        amount: '1',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '1uatom',
        receiver: 'cosmos1g7a7l9zp4h0vma5tqe5xnmvps3wyzumwel2j95',
      },
      coin_spent: {
        amount: '1uatom',
        spender: 'cosmos18377m4dkzz9exa6yctph0fu9ygsexgjvfy893w',
      },
      message: {
        action: '/cosmos.bank.v1beta1.MsgSend',
        module: 'bank',
        sender: 'cosmos18377m4dkzz9exa6yctph0fu9ygsexgjvfy893w',
      },
      transfer: {
        amount: '1uatom',
        recipient: 'cosmos1g7a7l9zp4h0vma5tqe5xnmvps3wyzumwel2j95',
        sender: 'cosmos18377m4dkzz9exa6yctph0fu9ygsexgjvfy893w',
      },
    },
  },
}

export default { tx }
