import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '4FFB4FADEBFC20AA46E82E2334FDD49E979F5AEB73CE9237810DAA4991236300',
  blockHash: '969AFB92CC61B4738B6D85E0FE0CAD25A64C509FD279DB78AEBE26A98CFC4D4E',
  blockHeight: 17513976,
  timestamp: 1697884190,
  confirmations: 1419791,
  fee: {
    amount: '3000',
    denom: 'uatom',
  },
  gasUsed: '77284',
  gasWanted: '200000',
  index: 1,
  memo: 'REFUND:4EAC7774DD66B1AC08C9FE36ABC324875CF64B31E591649E5E410898F1603AD1',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos1fpsa38rmg2v829umggnvj09acurtzycjnhgnt4',
      from: 'cosmos1fpsa38rmg2v829umggnvj09acurtzycjnhgnt4',
      to: 'cosmos1vvtcw3cvje0kthxca6w5q2nz5kxr9cnckrutgc',
      type: 'send',
      value: {
        amount: '201974667',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '201974667uatom',
        receiver: 'cosmos1vvtcw3cvje0kthxca6w5q2nz5kxr9cnckrutgc',
      },
      coin_spent: {
        amount: '201974667uatom',
        spender: 'cosmos1fpsa38rmg2v829umggnvj09acurtzycjnhgnt4',
      },
      message: {
        action: '/cosmos.bank.v1beta1.MsgSend',
        module: 'bank',
        sender: 'cosmos1fpsa38rmg2v829umggnvj09acurtzycjnhgnt4',
      },
      transfer: {
        amount: '201974667uatom',
        recipient: 'cosmos1vvtcw3cvje0kthxca6w5q2nz5kxr9cnckrutgc',
        sender: 'cosmos1fpsa38rmg2v829umggnvj09acurtzycjnhgnt4',
      },
    },
  },
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1697884124180902347',
      height: '13107966',
      in: [
        {
          address: 'cosmos1vvtcw3cvje0kthxca6w5q2nz5kxr9cnckrutgc',
          coins: [
            {
              amount: '20212975500',
              asset: 'GAIA.ATOM',
            },
          ],
          txID: '4EAC7774DD66B1AC08C9FE36ABC324875CF64B31E591649E5E410898F1603AD1',
        },
      ],
      metadata: {
        refund: {
          affiliateAddress: '',
          affiliateFee: '0',
          memo: 'loan-:BTC.BTC:bc1ql5udmmmnhgpqmtq45qa7sju59gwn9uuwm65f95:13164928',
          networkFees: [
            {
              amount: '15508800',
              asset: 'GAIA.ATOM',
            },
          ],
          reason: 'emit asset 13156361 less than price limit 13164928',
        },
      },
      out: [
        {
          address: 'cosmos1vvtcw3cvje0kthxca6w5q2nz5kxr9cnckrutgc',
          coins: [
            {
              amount: '20197466700',
              asset: 'GAIA.ATOM',
            },
          ],
          height: '13107980',
          txID: '4FFB4FADEBFC20AA46E82E2334FDD49E979F5AEB73CE9237810DAA4991236300',
        },
      ],
      pools: [],
      status: 'success',
      type: 'refund',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '131079669000000007',
    prevPageToken: '131079669000000007',
  },
}

export default { tx, actionsResponse }
