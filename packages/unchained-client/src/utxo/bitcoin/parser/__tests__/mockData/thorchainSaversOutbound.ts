import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '740ec4f695f8b13a5cdfcedecd5935eebcd4c291823c4f9f7ce439f6ea6e260f',
  blockHash: '0000000000000000000068db0c3196f7af78fa1cf7f7d51c05f9546ed667a0f7',
  blockHeight: 825282,
  timestamp: 1704969446,
  confirmations: 63,
  value: '9724530237',
  fee: '17484',
  hex: '01000000000101d5504539eb1c629ed853b8ea51592a2f7ad06fcc8f03e4882195787e8f9e3c740100000000ffffffff0353cc1100000000001600144634afc54fca8a04471d6dcd3d52df6862f3cf59eac18e4302000000160014801c4711208b6e3df236b9f3bbabfae52edcfa020000000000000000466a444f55543a363746303139453333384245383638324137443243393838323737423846333246433139374634323943433433414139423139354331344639353937373431450248304502210090fb40520ccebc45773f588b6b1e05c6f6fa12f74210cf49150253d41aa8026902201dd42c60453432853b9615ae1c2e02e454c412bb3e064a9ba09334ee12d24c30012102ea13b3619f73a04474af18459522b16fa8388f17d4a78393a8302b202c87548300000000',
  vin: [
    {
      txid: '743c9e8f7e78952188e4038fcc6fd07a2f2a5951eab853d89e621ceb394550d5',
      vout: '1',
      sequence: 4294967295,
      addresses: ['bc1qsqwywyfq3dhrmu3kh8emh2l6u5hde7szxpg99j'],
      value: '9724547721',
    },
  ],
  vout: [
    {
      value: '1166419',
      n: 0,
      scriptPubKey: {
        hex: '00144634afc54fca8a04471d6dcd3d52df6862f3cf59',
      },
      addresses: ['bc1qgc62l320e29qg3cadhxn65kldp308n6epn07ej'],
    },
    {
      value: '9723363818',
      n: 1,
      scriptPubKey: {
        hex: '0014801c4711208b6e3df236b9f3bbabfae52edcfa02',
      },
      addresses: ['bc1qsqwywyfq3dhrmu3kh8emh2l6u5hde7szxpg99j'],
    },
    {
      value: '0',
      n: 2,
      opReturn: 'OP_RETURN (OUT:67F019E338BE8682A7D2C988277B8F32FC197F429CC43AA9B195C14F9597741E)',
      scriptPubKey: {
        hex: '6a444f55543a36374630313945333338424538363832413744324339383832373742384633324643313937463432394343343341413942313935433134463935393737343145',
      },
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1704969152069324223',
      height: '14226934',
      in: [
        {
          address: 'bc1qgc62l320e29qg3cadhxn65kldp308n6epn07ej',
          coins: [
            {
              amount: '1183936',
              asset: 'BTC/BTC',
            },
          ],
          txID: '67F019E338BE8682A7D2C988277B8F32FC197F429CC43AA9B195C14F9597741E',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '188258',
          memo: '=:BTC.BTC:bc1qgc62l320e29qg3cadhxn65kldp308n6epn07ej',
          networkFees: [
            {
              amount: '93000',
              asset: 'BTC.BTC',
            },
          ],
          swapSlip: '0',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: 'bc1qgc62l320e29qg3cadhxn65kldp308n6epn07ej',
          coins: [
            {
              amount: '1166419',
              asset: 'BTC.BTC',
            },
          ],
          height: '14226967',
          txID: '740EC4F695F8B13A5CDFCEDECD5935EEBCD4C291823C4F9F7CE439F6EA6E260F',
        },
      ],
      pools: ['BTC.BTC'],
      status: 'success',
      type: 'swap',
    },
    {
      date: '1704969122087130650',
      height: '14226930',
      in: [
        {
          address: 'bc1qgc62l320e29qg3cadhxn65kldp308n6epn07ej',
          coins: [
            {
              amount: '10001',
              asset: 'BTC.BTC',
            },
          ],
          txID: '67F019E338BE8682A7D2C988277B8F32FC197F429CC43AA9B195C14F9597741E',
        },
      ],
      metadata: {
        withdraw: {
          asymmetry: '0',
          basisPoints: '10000',
          impermanentLossProtection: '0',
          liquidityUnits: '-1142776',
          memo: '-:BTC/BTC:10000',
          networkFees: [
            {
              amount: '93000',
              asset: 'BTC.BTC',
            },
          ],
        },
      },
      out: [
        {
          address: 'bc1qgc62l320e29qg3cadhxn65kldp308n6epn07ej',
          coins: [
            {
              amount: '1166419',
              asset: 'BTC.BTC',
            },
          ],
          height: '14226967',
          txID: '740EC4F695F8B13A5CDFCEDECD5935EEBCD4C291823C4F9F7CE439F6EA6E260F',
        },
      ],
      pools: ['BTC/BTC'],
      status: 'success',
      type: 'withdraw',
    },
  ],
  count: '2',
  meta: {
    nextPageToken: '142269301001360005',
    prevPageToken: '142269349000000060',
  },
}

export default { tx, actionsResponse }
