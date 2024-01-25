import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '39f1a4d0f9a7dba5365eb40c73590ca81c702676de18f0438556da8f6b179068',
  blockHash: '0000000000000000000056407ba45b95b4697e0b78bc96be0d9439f8c9ff76d6',
  blockHeight: 825199,
  timestamp: 1704927505,
  confirmations: 146,
  value: '10127250588',
  fee: '9212',
  hex: '010000000001015c218924b60667f02e922561d6a5cdb5d4756a0a1a3682ad9d494ac87a48bb810100000000ffffffff03a4c6010000000000160014b1f77916541c05e9789b6154b56d944e00942fd0f8cd9f5b02000000160014801c4711208b6e3df236b9f3bbabfae52edcfa020000000000000000466a444f55543a3038413836334433313041454346303038423441393734324135393636303345413030384336383242344534384646384646383043343038464245373245423302483045022100e8d2bac8222482d0d8290e3bb9259c025e603eb2d2f606ef0ce641ca441a5ece02204de27096b64613fd768bf3e53c6293056f46484ee590f616f7b11539537fa681012102ea13b3619f73a04474af18459522b16fa8388f17d4a78393a8302b202c87548300000000',
  vin: [
    {
      txid: '81bb487ac84a499dad82361a0a6a75d4b5cda5d66125922ef06706b62489215c',
      vout: '1',
      sequence: 4294967295,
      addresses: ['bc1qsqwywyfq3dhrmu3kh8emh2l6u5hde7szxpg99j'],
      value: '10127259800',
    },
  ],
  vout: [
    {
      value: '116388',
      n: 0,
      scriptPubKey: {
        hex: '0014b1f77916541c05e9789b6154b56d944e00942fd0',
      },
      addresses: ['bc1qk8mhj9j5rsz7j7ymv92t2mv5fcqfgt7scn9p72'],
    },
    {
      value: '10127134200',
      n: 1,
      scriptPubKey: {
        hex: '0014801c4711208b6e3df236b9f3bbabfae52edcfa02',
      },
      addresses: ['bc1qsqwywyfq3dhrmu3kh8emh2l6u5hde7szxpg99j'],
    },
    {
      value: '0',
      n: 2,
      opReturn: 'OP_RETURN (OUT:08A863D310AECF008B4A9742A596603EA008C682B4E48FF8FF80C408FBE72EB3)',
      scriptPubKey: {
        hex: '6a444f55543a30384138363344333130414543463030384234413937343241353936363033454130303843363832423445343846463846463830433430384642453732454233',
      },
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1704926256872734003',
      height: '14220195',
      in: [
        {
          address: '0x5b7e725729790240ccf2da19d92cad339153ce02',
          coins: [
            {
              amount: '19125435',
              asset: 'BSC.BNB',
            },
          ],
          txID: '08A863D310AECF008B4A9742A596603EA008C682B4E48FF8FF80C408FBE72EB3',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: 'ti',
          affiliateFee: '70',
          isStreamingSwap: true,
          liquidityFee: '35155',
          memo: '=:BTC.BTC:bc1qk8mhj9j5rsz7j7ymv92t2mv5fcqfgt7scn9p72:0/1/0:ti:70',
          networkFees: [
            {
              amount: '49500',
              asset: 'BTC.BTC',
            },
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
          ],
          swapSlip: '0',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: 'thor1dl7un46w7l7f3ewrnrm6nq58nerjtp0dradjtd',
          coins: [
            {
              amount: '6121855',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14220195',
          txID: '',
        },
        {
          address: 'bc1qk8mhj9j5rsz7j7ymv92t2mv5fcqfgt7scn9p72',
          coins: [
            {
              amount: '116388',
              asset: 'BTC.BTC',
            },
          ],
          height: '14220243',
          txID: '39F1A4D0F9A7DBA5365EB40C73590CA81C702676DE18F0438556DA8F6B179068',
        },
      ],
      pools: ['BSC.BNB', 'BTC.BTC'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '142201959000000014',
    prevPageToken: '142201959000000014',
  },
}

export default { tx, actionsResponse }
