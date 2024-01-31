import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '0x2db94227c2ba801e586764e060a5144749e6502547498df80a023849ae435140',
  blockHash: '0xaccfd764b1a19730b6e0177a85e8c6837e3487d2a57b1f0d6f77d1716be03aff',
  blockHeight: 19078109,
  timestamp: 1706118779,
  status: 1,
  from: '0x610c97879CD08D54721fD6CDfA143887778AD8c1',
  to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
  confirmations: 76,
  value: '4300220000000000',
  fee: '1107219399688080',
  gasLimit: '70269',
  gasUsed: '64836',
  gasPrice: '17077231780',
  inputData:
    '0x574da7170000000000000000000000006cc41829d0a67456970529f92d6abacc83d69e610000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f4706fd8e5800000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000444f55543a3635413735454537443530444433304139413430313637384538353832343431444643433433433246304634423945433943423131323341363446364533444300000000000000000000000000000000000000000000000000000000',
  internalTxs: [
    {
      from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
      to: '0x6CC41829d0a67456970529F92d6abACc83d69E61',
      value: '4300220000000000',
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1706118640078720597',
      height: '14411428',
      in: [
        {
          address: '0x6cc41829d0a67456970529f92d6abacc83d69e61',
          coins: [
            {
              amount: '4227498',
              asset: 'BSC.BNB',
            },
          ],
          txID: '65A75EE7D50DD30A9A401678E8582441DFCC43C2F0F4B9EC9CB1123A64F6E3DC',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: 'ti',
          affiliateFee: '70',
          isStreamingSwap: true,
          liquidityFee: '2171',
          memo: '=:ETH.ETH:0x6CC41829d0a67456970529F92d6abACc83d69E61:0/1/0:ti:70',
          networkFees: [
            {
              amount: '120000',
              asset: 'ETH.ETH',
            },
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
          ],
          streamingSwapMeta: {
            count: '1',
            depositedCoin: {
              amount: '4197906',
              asset: 'BSC.BNB',
            },
            inCoin: {
              amount: '4197906',
              asset: 'BSC.BNB',
            },
            interval: '1',
            lastHeight: '14411428',
            outCoin: {
              amount: '550022',
              asset: 'ETH.ETH',
            },
            quantity: '1',
          },
          swapSlip: '0',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: 'thor1dl7un46w7l7f3ewrnrm6nq58nerjtp0dradjtd',
          coins: [
            {
              amount: '111276',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14411428',
          txID: '',
        },
        {
          address: '0x6cc41829d0a67456970529f92d6abacc83d69e61',
          coins: [
            {
              amount: '430022',
              asset: 'ETH.ETH',
            },
          ],
          height: '14411452',
          txID: '2DB94227C2BA801E586764E060A5144749E6502547498DF80A023849AE435140',
        },
      ],
      pools: ['BSC.BNB', 'ETH.ETH'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '144114289000000017',
    prevPageToken: '144114289000000017',
  },
}

export default { tx, actionsResponse }
