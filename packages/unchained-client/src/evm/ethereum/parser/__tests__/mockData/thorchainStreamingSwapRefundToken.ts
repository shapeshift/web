import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '0xecada5446fc8a5a6aae64a0d2fb5cd72446cb0084117bbf9b909552f0ec98fc6',
  blockHash: '0x0b07b0c35452586106fc63dd9fd9b7dd871d25125bca060a8fbbe9193a1acbaa',
  blockHeight: 19078100,
  timestamp: 1706118671,
  status: 1,
  from: '0x5C04b555E86507742455b280A4F6436cC43af314',
  to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
  confirmations: 183,
  value: '0',
  fee: '2086860000000000',
  gasLimit: '75061',
  gasUsed: '69562',
  gasPrice: '30000000000',
  inputData:
    '0x574da717000000000000000000000000111ae447488df1bfa35c1ac9724b1246e839b0c00000000000000000000000007f39c581f595b53c5cb19bd0b3f8da6c935e2ca000000000000000000000000000000000000000000000000001bf6ed8548a3c0000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000047524546554e443a3441324441313531393135423238313732453231393143333232364245304144364132343542303233393544363736433531414246333145393944433531314200000000000000000000000000000000000000000000000000',
  tokenTransfers: [
    {
      contract: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
      decimals: 18,
      name: 'Wrapped liquid staked Ether 2.0',
      symbol: 'wstETH',
      type: 'ERC20',
      from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
      to: '0x111ae447488df1bfa35C1AC9724b1246e839b0C0',
      value: '125941190000000000',
    },
  ],
  internalTxs: [],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1706118585119807096',
      height: '14411419',
      in: [
        {
          address: '0x111ae447488df1bfa35c1ac9724b1246e839b0c0',
          coins: [
            {
              amount: '12801249',
              asset: 'ETH.WSTETH-0X7F39C581F595B53C5CB19BD0B3F8DA6C935E2CA0',
            },
          ],
          txID: '4A2DA151915B28172E2191C3226BE0AD6A245B02395D676C51ABF31E99DC511B',
        },
      ],
      metadata: {
        refund: {
          affiliateAddress: 'rg',
          affiliateFee: '15',
          memo: '=:b:3CAhgNk37kdQtg8yyNnfPEL8Gk5vP687KT:4998438/15/18:rg:15',
          networkFees: [
            {
              amount: '46500',
              asset: 'BTC.BTC',
            },
            {
              amount: '207130',
              asset: 'ETH.WSTETH-0X7F39C581F595B53C5CB19BD0B3F8DA6C935E2CA0',
            },
          ],
          reason: 'emit asset 824249 less than price limit 826558',
        },
      },
      out: [
        {
          address: '3CAhgNk37kdQtg8yyNnfPEL8Gk5vP687KT',
          coins: [
            {
              amount: '4163232',
              asset: 'BTC.BTC',
            },
          ],
          height: '14411434',
          txID: '50FDE36CE2EEBE0315BB73BFA560CAD264F60404B1F1269DE3E5D130DBECBC0C',
        },
        {
          address: '0x111ae447488df1bfa35c1ac9724b1246e839b0c0',
          coins: [
            {
              amount: '12594119',
              asset: 'ETH.WSTETH-0X7F39C581F595B53C5CB19BD0B3F8DA6C935E2CA0',
            },
          ],
          height: '14411434',
          txID: 'ECADA5446FC8A5A6AAE64A0D2FB5CD72446CB0084117BBF9B909552F0EC98FC6',
        },
      ],
      pools: [],
      status: 'success',
      type: 'refund',
    },
    {
      date: '1706117020544126126',
      height: '14411164',
      in: [
        {
          address: '0x111ae447488df1bfa35c1ac9724b1246e839b0c0',
          coins: [
            {
              amount: '64121599',
              asset: 'ETH.WSTETH-0X7F39C581F595B53C5CB19BD0B3F8DA6C935E2CA0',
            },
          ],
          txID: '4A2DA151915B28172E2191C3226BE0AD6A245B02395D676C51ABF31E99DC511B',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: 'rg',
          affiliateFee: '15',
          isStreamingSwap: true,
          liquidityFee: '20706068',
          memo: '=:b:3CAhgNk37kdQtg8yyNnfPEL8Gk5vP687KT:4998438/15/18:rg:15',
          networkFees: [
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
            {
              amount: '46500',
              asset: 'BTC.BTC',
            },
            {
              amount: '207130',
              asset: 'ETH.WSTETH-0X7F39C581F595B53C5CB19BD0B3F8DA6C935E2CA0',
            },
          ],
          streamingSwapMeta: {
            count: '18',
            depositedCoin: {
              amount: '76807464',
              asset: 'ETH.WSTETH-0X7F39C581F595B53C5CB19BD0B3F8DA6C935E2CA0',
            },
            inCoin: {
              amount: '64006215',
              asset: 'ETH.WSTETH-0X7F39C581F595B53C5CB19BD0B3F8DA6C935E2CA0',
            },
            interval: '15',
            lastHeight: '14411419',
            outCoin: {
              amount: '4171880',
              asset: 'BTC.BTC',
            },
            quantity: '18',
          },
          swapSlip: '5',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: 'thor160ar0d33suh3nc4cd87evq27p3ajklfy6allj5',
          coins: [
            {
              amount: '72970961',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14411164',
          txID: '',
        },
        {
          address: '3CAhgNk37kdQtg8yyNnfPEL8Gk5vP687KT',
          coins: [
            {
              amount: '4163232',
              asset: 'BTC.BTC',
            },
          ],
          height: '14411434',
          txID: '50FDE36CE2EEBE0315BB73BFA560CAD264F60404B1F1269DE3E5D130DBECBC0C',
        },
        {
          address: '0x111ae447488df1bfa35c1ac9724b1246e839b0c0',
          coins: [
            {
              amount: '12594119',
              asset: 'ETH.WSTETH-0X7F39C581F595B53C5CB19BD0B3F8DA6C935E2CA0',
            },
          ],
          height: '14411434',
          txID: 'ECADA5446FC8A5A6AAE64A0D2FB5CD72446CB0084117BBF9B909552F0EC98FC6',
        },
      ],
      pools: ['ETH.WSTETH-0X7F39C581F595B53C5CB19BD0B3F8DA6C935E2CA0', 'BTC.BTC'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '2',
  meta: {
    nextPageToken: '144111649000000001',
    prevPageToken: '144114199000000013',
  },
}

export default { tx, actionsResponse }
