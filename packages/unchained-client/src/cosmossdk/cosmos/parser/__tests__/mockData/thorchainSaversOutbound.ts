import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '5A836F792497667FFD3CA9A641A96EA9F5E6C29F4949A2432F45E048BA245C58',
  blockHash: 'EFFEC076663BBF0DC679C90C265A6D223AF0383AFF8089117730567C099677E7',
  blockHeight: 18926030,
  timestamp: 1706512477,
  confirmations: 7452,
  fee: {
    amount: '3000',
    denom: 'uatom',
  },
  gasUsed: '74718',
  gasWanted: '200000',
  index: 0,
  memo: 'OUT:860B73A29EA69D7FB24B4B17893CF7CDB3B66C2BB9DD91872B140A2F325294D8',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
      from: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
      to: 'cosmos1g7ufueqz24luzcj0d5h8u3452vv4l4d9fz0fdn',
      type: 'send',
      value: {
        amount: '9066156',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '9066156uatom',
        receiver: 'cosmos1g7ufueqz24luzcj0d5h8u3452vv4l4d9fz0fdn',
      },
      coin_spent: {
        amount: '9066156uatom',
        spender: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
      },
      message: {
        action: '/cosmos.bank.v1beta1.MsgSend',
        module: 'bank',
        sender: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
      },
      transfer: {
        amount: '9066156uatom',
        recipient: 'cosmos1g7ufueqz24luzcj0d5h8u3452vv4l4d9fz0fdn',
        sender: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
      },
    },
  },
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1706510619064369916',
      height: '14474838',
      in: [
        {
          address: 'cosmos1g7ufueqz24luzcj0d5h8u3452vv4l4d9fz0fdn',
          coins: [
            {
              amount: '917198012',
              asset: 'GAIA/ATOM',
            },
          ],
          txID: '860B73A29EA69D7FB24B4B17893CF7CDB3B66C2BB9DD91872B140A2F325294D8',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '210115',
          memo: '=:GAIA.ATOM:cosmos1g7ufueqz24luzcj0d5h8u3452vv4l4d9fz0fdn',
          networkFees: [
            {
              amount: '10442000',
              asset: 'GAIA.ATOM',
            },
          ],
          swapSlip: '2',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: 'cosmos1g7ufueqz24luzcj0d5h8u3452vv4l4d9fz0fdn',
          coins: [
            {
              amount: '906615600',
              asset: 'GAIA.ATOM',
            },
          ],
          height: '14475145',
          txID: '5A836F792497667FFD3CA9A641A96EA9F5E6C29F4949A2432F45E048BA245C58',
        },
      ],
      pools: ['GAIA.ATOM'],
      status: 'success',
      type: 'swap',
    },
    {
      date: '1706510619064369916',
      height: '14474838',
      in: [
        {
          address: 'cosmos1g7ufueqz24luzcj0d5h8u3452vv4l4d9fz0fdn',
          coins: [
            {
              amount: '10000',
              asset: 'GAIA.ATOM',
            },
          ],
          txID: '860B73A29EA69D7FB24B4B17893CF7CDB3B66C2BB9DD91872B140A2F325294D8',
        },
      ],
      metadata: {
        withdraw: {
          asymmetry: '0',
          basisPoints: '10000',
          impermanentLossProtection: '0',
          liquidityUnits: '-804798196',
          memo: '-:GAIA/ATOM:10000',
          networkFees: [
            {
              amount: '10442000',
              asset: 'GAIA.ATOM',
            },
          ],
        },
      },
      out: [
        {
          address: 'cosmos1g7ufueqz24luzcj0d5h8u3452vv4l4d9fz0fdn',
          coins: [
            {
              amount: '906615600',
              asset: 'GAIA.ATOM',
            },
          ],
          height: '14475145',
          txID: '5A836F792497667FFD3CA9A641A96EA9F5E6C29F4949A2432F45E048BA245C58',
        },
      ],
      pools: ['GAIA/ATOM'],
      status: 'success',
      type: 'withdraw',
    },
  ],
  count: '2',
  meta: {
    nextPageToken: '144748381002100005',
    prevPageToken: '144748389000000085',
  },
}

export default { tx, actionsResponse }
