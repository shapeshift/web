import type { ActionsResponse } from '../../../../../parser/mayachain'
import type { Tx } from '../../../../types'

const tx: Tx = {
  txid: '05132046F53E17F12DAA30C4BB1D970210D7309F86FA67D06B04EBB02FA82409',
  blockHash: '0F90BBEB20A674D34AB9E825A05953A646FB3B58C7AF6E5D614F86F1DCCFA684',
  blockHeight: 11692807,
  timestamp: 1750350721,
  confirmations: 15210,
  fee: {
    amount: '2000000000',
    denom: 'cacao',
  },
  gasUsed: '0',
  gasWanted: '0',
  index: -1,
  memo: 'OUT:05132046F53E17F12DAA30C4BB1D970210D7309F86FA67D06B04EBB02FA82409',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl',
      from: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl',
      to: 'maya1cups30hy0e54l8mrwux7707r7quk2syzhggjcy',
      type: 'outbound',
      value: {
        amount: '65918546170682',
        denom: 'cacao',
      },
    },
  ],
  events: {
    '0': {
      outbound: {
        chain: 'MAYA',
        coin: '65918546170682 MAYA.CACAO',
        from: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl',
        id: '0000000000000000000000000000000000000000000000000000000000000000',
        in_tx_id: '05132046F53E17F12DAA30C4BB1D970210D7309F86FA67D06B04EBB02FA82409',
        memo: 'OUT:05132046F53E17F12DAA30C4BB1D970210D7309F86FA67D06B04EBB02FA82409',
        to: 'maya1cups30hy0e54l8mrwux7707r7quk2syzhggjcy',
      },
    },
  },
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1750350721749192774',
      height: '11692807',
      in: [
        {
          address: 'bc1qszqaswa7n02s5x25vv8pt5t2x4w09y6sju90g4',
          coins: [
            {
              amount: '1000000',
              asset: 'BTC.BTC',
            },
          ],
          txID: '05132046F53E17F12DAA30C4BB1D970210D7309F86FA67D06B04EBB02FA82409',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: 'leo/lref',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '19976003997',
          memo: '=:c:maya1cups30hy0e54l8mrwux7707r7quk2syzhggjcy:0/3/0:leo/lref:28/12',
          networkFees: [
            {
              amount: '2000000000',
              asset: 'MAYA.CACAO',
            },
          ],
          streamingSwapMeta: {
            count: '1',
            depositedCoin: {
              amount: '1000000',
              asset: 'BTC.BTC',
            },
            inCoin: {
              amount: '1000000',
              asset: 'BTC.BTC',
            },
            interval: '3',
            lastHeight: '11692807',
            outCoin: {
              amount: '66185287319962',
              asset: 'MAYA.CACAO',
            },
            quantity: '1',
          },
          swapSlip: '8',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: 'maya1cups30hy0e54l8mrwux7707r7quk2syzhggjcy',
          coins: [
            {
              amount: '65918546170682',
              asset: 'MAYA.CACAO',
            },
          ],
          height: '11692807',
          txID: '',
        },
      ],
      pools: ['BTC.BTC'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '116928079000000001',
    prevPageToken: '116928079000000001',
  },
}

export default { tx, actionsResponse }
