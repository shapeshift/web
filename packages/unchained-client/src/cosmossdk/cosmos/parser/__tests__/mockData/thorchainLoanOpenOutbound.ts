import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '9F1FC796CE223AB569C52ABBDEB9F3DCA1F3A2E0531C3A1A4DA724A2D9E485BF',
  blockHash: '04B83E1946E4A740420A0CA3CDD3338BE74B83AF35A50282E67922DC58BCCCE5',
  blockHeight: 18784236,
  timestamp: 1705641903,
  confirmations: 149510,
  fee: {
    amount: '3000',
    denom: 'uatom',
  },
  gasUsed: '81385',
  gasWanted: '200000',
  index: 37,
  memo: 'OUT:C8ECD3A1C72473C294A63428E6284B2CEEC972BFA7372DF475F381777168D486',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos1vkakp7qxx2sjxnp3hyw592h2yxd530yvkng95e',
      from: 'cosmos1vkakp7qxx2sjxnp3hyw592h2yxd530yvkng95e',
      to: 'cosmos173xmmmzpalc9h7ynwtn6fl76h78n57e8kp7cp6',
      type: 'send',
      value: {
        amount: '70370080',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '70370080uatom',
        receiver: 'cosmos173xmmmzpalc9h7ynwtn6fl76h78n57e8kp7cp6',
      },
      coin_spent: {
        amount: '70370080uatom',
        spender: 'cosmos1vkakp7qxx2sjxnp3hyw592h2yxd530yvkng95e',
      },
      message: {
        action: '/cosmos.bank.v1beta1.MsgSend',
        module: 'bank',
        sender: 'cosmos1vkakp7qxx2sjxnp3hyw592h2yxd530yvkng95e',
      },
      transfer: {
        amount: '70370080uatom',
        recipient: 'cosmos173xmmmzpalc9h7ynwtn6fl76h78n57e8kp7cp6',
        sender: 'cosmos1vkakp7qxx2sjxnp3hyw592h2yxd530yvkng95e',
      },
    },
  },
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1705641880384808742',
      height: '14334822',
      in: [
        {
          address: '0x13361c3e764a3b1ecdedf8ec9a41d339ed6e4bc1',
          coins: [
            {
              amount: '100000000',
              asset: 'ETH.ETH',
            },
          ],
          txID: 'C8ECD3A1C72473C294A63428E6284B2CEEC972BFA7372DF475F381777168D486',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '10393190',
          memo: 'loan+:GAIA.ATOM:cosmos173xmmmzpalc9h7ynwtn6fl76h78n57e8kp7cp6:0:thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk:0:::0',
          networkFees: [
            {
              amount: '10403800',
              asset: 'GAIA.ATOM',
            },
          ],
          swapSlip: '2',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: 'cosmos173xmmmzpalc9h7ynwtn6fl76h78n57e8kp7cp6',
          coins: [
            {
              amount: '7037008000',
              asset: 'GAIA.ATOM',
            },
          ],
          height: '14334829',
          txID: '9F1FC796CE223AB569C52ABBDEB9F3DCA1F3A2E0531C3A1A4DA724A2D9E485BF',
        },
      ],
      pools: ['ETH.ETH', 'THOR.ETH'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '143348229000000016',
    prevPageToken: '143348229000000016',
  },
}

export default { tx, actionsResponse }
