import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '96E69FB82E08FE735306493ED5EAF0DB7AC36AE71A180649929FB76ADF6F52DD',
  blockHash: '8A282343D3B0FA7DD9F7BB9A0F66ED41AD5D3182A7DC443C0823ADBBE24E49B9',
  blockHeight: 14368526,
  timestamp: 1705853251,
  confirmations: 128114,
  fee: {
    amount: '37025832',
    denom: 'ETH.LINK-0X514910771AF9CA656AF840DFF83E8264ECF986CA',
  },
  gasUsed: '0',
  gasWanted: '0',
  index: -1,
  memo: 'REFUND:96E69FB82E08FE735306493ED5EAF0DB7AC36AE71A180649929FB76ADF6F52DD',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      to: 'thor14d84esehyv8w3g9mz9kuafzl65gdd6ns647q7q',
      type: 'outbound',
      value: {
        amount: '46426571430',
        denom: 'rune',
      },
    },
  ],
  events: {
    '0': {
      outbound: {
        chain: 'THOR',
        coin: '46426571430 THOR.RUNE',
        from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
        id: '0000000000000000000000000000000000000000000000000000000000000000',
        in_tx_id: '96E69FB82E08FE735306493ED5EAF0DB7AC36AE71A180649929FB76ADF6F52DD',
        memo: 'REFUND:96E69FB82E08FE735306493ED5EAF0DB7AC36AE71A180649929FB76ADF6F52DD',
        to: 'thor14d84esehyv8w3g9mz9kuafzl65gdd6ns647q7q',
      },
    },
  },
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1705853251442907665',
      height: '14368526',
      in: [
        {
          address: 'thor14d84esehyv8w3g9mz9kuafzl65gdd6ns647q7q',
          coins: [
            {
              amount: '46428571430',
              asset: 'THOR.RUNE',
            },
          ],
          txID: '96E69FB82E08FE735306493ED5EAF0DB7AC36AE71A180649929FB76ADF6F52DD',
        },
      ],
      metadata: {
        refund: {
          affiliateAddress: 't',
          affiliateFee: '0',
          memo: '=:ETH.LINK:0x63f8cFc60559dc1305698d1fa1AF441380aD1635:13678977900/3/28:t:0',
          networkFees: [
            {
              amount: '37025832',
              asset: 'ETH.LINK-0X514910771AF9CA656AF840DFF83E8264ECF986CA',
            },
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
          ],
          reason: 'emit asset 12033452155 less than price limit 12666419662',
        },
      },
      out: [
        {
          address: 'thor14d84esehyv8w3g9mz9kuafzl65gdd6ns647q7q',
          coins: [
            {
              amount: '46426571430',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14368526',
          txID: '',
        },
        {
          address: '0x63f8cfc60559dc1305698d1fa1af441380ad1635',
          coins: [
            {
              amount: '975532406',
              asset: 'ETH.LINK-0X514910771AF9CA656AF840DFF83E8264ECF986CA',
            },
          ],
          height: '14368532',
          txID: '5C2167D539F5C4EFC098195945563D6D531509BE1E56BA1FE0A2B00ADA6F48AC',
        },
      ],
      pools: [],
      status: 'success',
      type: 'refund',
    },
    {
      date: '1705852754136984645',
      height: '14368445',
      in: [
        {
          address: 'thor14d84esehyv8w3g9mz9kuafzl65gdd6ns647q7q',
          coins: [
            {
              amount: '3571428570',
              asset: 'THOR.RUNE',
            },
          ],
          txID: '96E69FB82E08FE735306493ED5EAF0DB7AC36AE71A180649929FB76ADF6F52DD',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: 't',
          affiliateFee: '0',
          isStreamingSwap: true,
          liquidityFee: '1795584',
          memo: '=:ETH.LINK:0x63f8cFc60559dc1305698d1fa1AF441380aD1635:13678977900/3/28:t:0',
          networkFees: [
            {
              amount: '37025832',
              asset: 'ETH.LINK-0X514910771AF9CA656AF840DFF83E8264ECF986CA',
            },
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
          ],
          streamingSwapMeta: {
            count: '28',
            depositedCoin: {
              amount: '50000000000',
              asset: 'THOR.RUNE',
            },
            inCoin: {
              amount: '3571428570',
              asset: 'THOR.RUNE',
            },
            interval: '3',
            lastHeight: '14368526',
            outCoin: {
              amount: '1012558238',
              asset: 'ETH.LINK-0X514910771AF9CA656AF840DFF83E8264ECF986CA',
            },
            quantity: '28',
          },
          swapSlip: '5',
          swapTarget: '488534925',
        },
      },
      out: [
        {
          address: 'thor14d84esehyv8w3g9mz9kuafzl65gdd6ns647q7q',
          coins: [
            {
              amount: '46426571430',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14368526',
          txID: '',
        },
        {
          address: '0x63f8cfc60559dc1305698d1fa1af441380ad1635',
          coins: [
            {
              amount: '975532406',
              asset: 'ETH.LINK-0X514910771AF9CA656AF840DFF83E8264ECF986CA',
            },
          ],
          height: '14368532',
          txID: '5C2167D539F5C4EFC098195945563D6D531509BE1E56BA1FE0A2B00ADA6F48AC',
        },
      ],
      pools: ['ETH.LINK-0X514910771AF9CA656AF840DFF83E8264ECF986CA'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '2',
  meta: {
    nextPageToken: '143684459000000001',
    prevPageToken: '143685269000000017',
  },
}

export default { tx, actionsResponse }
