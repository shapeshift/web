import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '1D9ACD5A60BA7A85D5609FA27FE387D2B1AA92E8E25062FE7E34DF3E3C8B4E8A',
  blockHash: '8AB9F87AD1AB37DD54E6BBD90AB9D2B9A5B715599C4FC79EA942B9843C844476',
  blockHeight: 18932786,
  timestamp: 1706554929,
  confirmations: 206,
  fee: {
    amount: '3000',
    denom: 'uatom',
  },
  gasUsed: '74840',
  gasWanted: '200000',
  index: 2,
  memo: 'OUT:59DDC87BE3B99846002140031F28AB0E1A1E4F01D0DA3A2D252953D9D47C9912',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
      from: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
      to: 'cosmos1laznh8p3tvwu7q8ytrnn6nrntfyx0mpvvrltzl',
      type: 'send',
      value: {
        amount: '237608436',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '237608436uatom',
        receiver: 'cosmos1laznh8p3tvwu7q8ytrnn6nrntfyx0mpvvrltzl',
      },
      coin_spent: {
        amount: '237608436uatom',
        spender: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
      },
      message: {
        action: '/cosmos.bank.v1beta1.MsgSend',
        module: 'bank',
        sender: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
      },
      transfer: {
        amount: '237608436uatom',
        recipient: 'cosmos1laznh8p3tvwu7q8ytrnn6nrntfyx0mpvvrltzl',
        sender: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
      },
    },
  },
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1706554872420342581',
      height: '14482023',
      in: [
        {
          address: '0xa48228e5b12942ee4cb47bcdedd8420b60f09a3d',
          coins: [
            {
              amount: '6366859000',
              asset: 'AVAX.AVAX',
            },
          ],
          txID: '59DDC87BE3B99846002140031F28AB0E1A1E4F01D0DA3A2D252953D9D47C9912',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: 't',
          affiliateFee: '30',
          isStreamingSwap: true,
          liquidityFee: '29804613',
          memo: '=:GAIA.ATOM:cosmos1laznh8p3tvwu7q8ytrnn6nrntfyx0mpvvrltzl:23027761200/3/3:t:30',
          networkFees: [
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
            {
              amount: '10322000',
              asset: 'GAIA.ATOM',
            },
          ],
          streamingSwapMeta: {
            count: '3',
            depositedCoin: {
              amount: '6347758423',
              asset: 'AVAX.AVAX',
            },
            inCoin: {
              amount: '6347758423',
              asset: 'AVAX.AVAX',
            },
            interval: '3',
            lastHeight: '14482029',
            outCoin: {
              amount: '23771165600',
              asset: 'GAIA.ATOM',
            },
            quantity: '3',
          },
          swapSlip: '1',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: 'thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk',
          coins: [
            {
              amount: '156433670',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14482023',
          txID: '',
        },
        {
          address: 'cosmos1laznh8p3tvwu7q8ytrnn6nrntfyx0mpvvrltzl',
          coins: [
            {
              amount: '23760843600',
              asset: 'GAIA.ATOM',
            },
          ],
          height: '14482035',
          txID: '1D9ACD5A60BA7A85D5609FA27FE387D2B1AA92E8E25062FE7E34DF3E3C8B4E8A',
        },
      ],
      pools: ['AVAX.AVAX', 'GAIA.ATOM'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '144820239000000035',
    prevPageToken: '144820239000000035',
  },
}

export default { tx, actionsResponse }
