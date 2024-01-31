import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '0x54b0e4c9620de7971aa7807ebd1e5c75b2b72da8945933ac8aecd1eb5c28778a',
  blockHash: '0xf5c762b665def0d67054c65f0b59a0e8e2c5490be53c383c2e9379df95488857',
  blockHeight: 19077677,
  timestamp: 1706113559,
  status: 1,
  from: '0xDE91BbA05160925F0Ef903c2434161bB05Ce9505',
  to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
  confirmations: 596,
  value: '0',
  fee: '1910850000000000',
  gasLimit: '69112',
  gasUsed: '63695',
  gasPrice: '30000000000',
  inputData:
    '0x574da71700000000000000000000000002416c573925a104573e00fc9b7dd5ad83cf37ae000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec700000000000000000000000000000000000000000000000000000000097f54fe000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000444f55543a3937433838324430393942393543383943354637334330453946383938353743364437363736424231413734413539363138464141393137453238303532423600000000000000000000000000000000000000000000000000000000',
  tokenTransfers: [
    {
      contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
      name: 'Tether USD',
      symbol: 'USDT',
      type: 'ERC20',
      from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
      to: '0x02416c573925A104573E00Fc9b7dd5aD83CF37ae',
      value: '159339774',
    },
  ],
  internalTxs: [],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1706113505473690942',
      height: '14410593',
      in: [
        {
          address: 'bc1qjgckdfa5z2xapfvpus3wuvjufp65vhcg3sv355',
          coins: [
            {
              amount: '414894',
              asset: 'BTC.BTC',
            },
          ],
          txID: '97C882D099B95C89C5F73C0E9F89857C6D7676BB1A74A59618FAA917E28052B6',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: 'ti',
          affiliateFee: '70',
          isStreamingSwap: true,
          liquidityFee: '93916',
          memo: '=:ETH.USDT-EC7:0x02416c573925A104573E00Fc9b7dd5aD83CF37ae:0/1/0:ti:70',
          networkFees: [
            {
              amount: '535497400',
              asset: 'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
            },
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
          ],
          streamingSwapMeta: {
            count: '1',
            depositedCoin: {
              amount: '411990',
              asset: 'BTC.BTC',
            },
            inCoin: {
              amount: '411990',
              asset: 'BTC.BTC',
            },
            interval: '1',
            lastHeight: '14410593',
            outCoin: {
              amount: '16469474800',
              asset: 'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
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
              amount: '26494006',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14410593',
          txID: '',
        },
        {
          address: '0x02416c573925a104573e00fc9b7dd5ad83cf37ae',
          coins: [
            {
              amount: '15933977400',
              asset: 'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
            },
          ],
          height: '14410603',
          txID: '54B0E4C9620DE7971AA7807EBD1E5C75B2B72DA8945933AC8AECD1EB5C28778A',
        },
      ],
      pools: ['BTC.BTC', 'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '144105939000000044',
    prevPageToken: '144105939000000044',
  },
}

export default { tx, actionsResponse }
