import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: 'AC19732EBC69FAF64BD804615D6F92AE76AB0E873ABDFE17453840894771E288',
  blockHash: 'BDE4259AD10D4400C226379C4CBF71C418FBFB94554D48333E438F5FEA9BAFCD',
  blockHeight: 18682966,
  timestamp: 1705025647,
  confirmations: 250696,
  fee: {
    amount: '6000',
    denom: 'uatom',
  },
  gasUsed: '74563',
  gasWanted: '200000',
  index: 2,
  memo: 'REFUND:70D66FC759772014C0273EB84691A2A4BFFCD0EFA6ED3A4E5A9A021C1FF53338',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos1h7cjvuc3gtt3r4afm0zqvhvrpkfw0ahx4nszv3',
      from: 'cosmos1h7cjvuc3gtt3r4afm0zqvhvrpkfw0ahx4nszv3',
      to: 'cosmos1x04c87s4kyfr3ktrvkd47h43jlz35gys0rjfn0',
      type: 'send',
      value: {
        amount: '5678021',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '5678021uatom',
        receiver: 'cosmos1x04c87s4kyfr3ktrvkd47h43jlz35gys0rjfn0',
      },
      coin_spent: {
        amount: '5678021uatom',
        spender: 'cosmos1h7cjvuc3gtt3r4afm0zqvhvrpkfw0ahx4nszv3',
      },
      message: {
        action: '/cosmos.bank.v1beta1.MsgSend',
        module: 'bank',
        sender: 'cosmos1h7cjvuc3gtt3r4afm0zqvhvrpkfw0ahx4nszv3',
      },
      transfer: {
        amount: '5678021uatom',
        recipient: 'cosmos1x04c87s4kyfr3ktrvkd47h43jlz35gys0rjfn0',
        sender: 'cosmos1h7cjvuc3gtt3r4afm0zqvhvrpkfw0ahx4nszv3',
      },
    },
  },
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1705025575076349651',
      height: '14235639',
      in: [
        {
          address: 'cosmos1x04c87s4kyfr3ktrvkd47h43jlz35gys0rjfn0',
          coins: [
            {
              amount: '577214100',
              asset: 'GAIA.ATOM',
            },
          ],
          txID: '70D66FC759772014C0273EB84691A2A4BFFCD0EFA6ED3A4E5A9A021C1FF53338',
        },
      ],
      metadata: {
        refund: {
          affiliateAddress: 't',
          affiliateFee: '0',
          memo: '+:GAIA.ATOM:thor1l7ml4d6pvuz2ydkuy0dx43sl6sa5gv5f8zmep4:t:0',
          networkFees: [
            {
              amount: '9412000',
              asset: 'GAIA.ATOM',
            },
          ],
          reason: 'trading halted',
        },
      },
      out: [
        {
          address: 'cosmos1x04c87s4kyfr3ktrvkd47h43jlz35gys0rjfn0',
          coins: [
            {
              amount: '567802100',
              asset: 'GAIA.ATOM',
            },
          ],
          height: '14235657',
          txID: 'AC19732EBC69FAF64BD804615D6F92AE76AB0E873ABDFE17453840894771E288',
        },
      ],
      pools: [],
      status: 'success',
      type: 'refund',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '142356391000970011',
    prevPageToken: '142356391000970011',
  },
}

export default { tx, actionsResponse }
