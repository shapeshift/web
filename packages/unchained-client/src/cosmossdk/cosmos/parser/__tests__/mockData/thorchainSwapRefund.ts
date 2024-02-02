import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '51A3A7766197AAE2D793A2C96B920A9D0DF9A7967681DDD9912FF70C13F91857',
  blockHash: '6DCEA32CA8FE6513F946B1B1542B71DDBB1CBEE9298BE0EAF1CEF0958B002E03',
  blockHeight: 18932792,
  timestamp: 1706554967,
  confirmations: 163,
  fee: {
    amount: '3000',
    denom: 'uatom',
  },
  gasUsed: '74876',
  gasWanted: '200000',
  index: 4,
  memo: 'REFUND:361F10B0AEAB2DD40B431EA4941D0EA5A18BE6AE10E29C0F845375955B4860F4',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
      from: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
      to: 'cosmos1dnssyzyhnja28zdww2ffa6fcxaxwanguf7nmq7',
      type: 'send',
      value: {
        amount: '175005078',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '175005078uatom',
        receiver: 'cosmos1dnssyzyhnja28zdww2ffa6fcxaxwanguf7nmq7',
      },
      coin_spent: {
        amount: '175005078uatom',
        spender: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
      },
      message: {
        action: '/cosmos.bank.v1beta1.MsgSend',
        module: 'bank',
        sender: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
      },
      transfer: {
        amount: '175005078uatom',
        recipient: 'cosmos1dnssyzyhnja28zdww2ffa6fcxaxwanguf7nmq7',
        sender: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
      },
    },
  },
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1706554939476403508',
      height: '14482034',
      in: [
        {
          address: 'cosmos1dnssyzyhnja28zdww2ffa6fcxaxwanguf7nmq7',
          coins: [
            {
              amount: '17510850000',
              asset: 'GAIA.ATOM',
            },
          ],
          txID: '361F10B0AEAB2DD40B431EA4941D0EA5A18BE6AE10E29C0F845375955B4860F4',
        },
      ],
      metadata: {
        refund: {
          affiliateAddress: '',
          affiliateFee: '0',
          memo: 'SWAP:THOR.RUNE:thor166n4w5039meulfa3p6ydg60ve6ueac7tlt0jws:38640185617',
          networkFees: [
            {
              amount: '10342200',
              asset: 'GAIA.ATOM',
            },
          ],
          reason: 'emit asset 38620456000 less than price limit 38640185617',
        },
      },
      out: [
        {
          address: 'cosmos1dnssyzyhnja28zdww2ffa6fcxaxwanguf7nmq7',
          coins: [
            {
              amount: '17500507800',
              asset: 'GAIA.ATOM',
            },
          ],
          height: '14482041',
          txID: '51A3A7766197AAE2D793A2C96B920A9D0DF9A7967681DDD9912FF70C13F91857',
        },
      ],
      pools: [],
      status: 'success',
      type: 'refund',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '144820349000000034',
    prevPageToken: '144820349000000034',
  },
}

export default { tx, actionsResponse }
