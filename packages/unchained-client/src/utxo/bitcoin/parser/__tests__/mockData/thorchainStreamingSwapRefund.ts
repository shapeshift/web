import type { ActionsResponse } from '../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '772ead20ed7d60fbfba15eea0dc2cf71dfe945605a4caed79db8a852d005e212',
  blockHash: '0000000000000000000388f199739861321ef85985502c0e48dd0bc9614574b1',
  blockHeight: 825081,
  timestamp: 1704853769,
  confirmations: 269,
  value: '36827315371',
  fee: '17763',
  hex: '010000000001012df0ece4d36ae85959f89652bd46e41ded5f7ed6d773fbee46b9e58f839784020100000000ffffffff0355b8010700000000160014ea61c41f8cb991da73a5014b6aea776e8efc97d35684128c0800000016001427fce96d5f6a72244e56563c7eb41fb79ac5ecf00000000000000000496a47524546554e443a3038393333443235414430363541364339364536304241324130453544454432333831304538413330334433453036313932424439333933313439443530303202473044022001d365c35ce3eb806e3c0d4e8e91335c052d59dfdd5618b11d97e7b13734daa20220437f9130cdf444ff360f2dbce80a46bc25579b59179087d36b7d602c601d40eb0121027b7c1a30b26b2a107934ba542bec15e28efa52a05541515966828181c55f0c1f00000000',
  vin: [
    {
      txid: '028497838fe5b946eefb73d7d67e5fed1de446bd5296f85959e86ad3e4ecf02d',
      vout: '1',
      sequence: 4294967295,
      addresses: ['bc1qyl7wjm2ldfezgnjk2c78adqlk7dvtm8sd7gn0q'],
      value: '36827333134',
    },
  ],
  vout: [
    {
      value: '117553237',
      n: 0,
      scriptPubKey: {
        hex: '0014ea61c41f8cb991da73a5014b6aea776e8efc97d3',
      },
      addresses: ['bc1qafsug8uvhxga5ua9q99k46nhd680e97n26egzc'],
    },
    {
      value: '36709762134',
      n: 1,
      scriptPubKey: {
        hex: '001427fce96d5f6a72244e56563c7eb41fb79ac5ecf0',
      },
      addresses: ['bc1qyl7wjm2ldfezgnjk2c78adqlk7dvtm8sd7gn0q'],
    },
    {
      value: '0',
      n: 2,
      opReturn:
        'OP_RETURN (REFUND:08933D25AD065A6C96E60BA2A0E5DED23810E8A303D3E06192BD9393149D5002)',
      scriptPubKey: {
        hex: '6a47524546554e443a30383933334432354144303635413643393645363042413241304535444544323338313045384133303344334530363139324244393339333134394435303032',
      },
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1704846972505457968',
      height: '14207846',
      in: [
        {
          address: 'bc1qafsug8uvhxga5ua9q99k46nhd680e97n26egzc',
          coins: [
            {
              amount: '117646000',
              asset: 'BTC.BTC',
            },
          ],
          txID: '08933D25AD065A6C96E60BA2A0E5DED23810E8A303D3E06192BD9393149D5002',
        },
      ],
      metadata: {
        refund: {
          affiliateAddress: 't',
          affiliateFee: '30',
          memo: '=:e:0xc6ebf3bd612844a533f63a702149bb09f356f5d8:2272314978/3/5:t:30',
          networkFees: [
            {
              amount: '168000',
              asset: 'BTC.BTC',
            },
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
          ],
          reason: 'emit asset 564938548 less than price limit 568078744',
        },
      },
      out: [
        {
          address: 'thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk',
          coins: [
            {
              amount: '3401542016',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14207851',
          txID: '',
        },
        {
          address: 'bc1qafsug8uvhxga5ua9q99k46nhd680e97n26egzc',
          coins: [
            {
              amount: '117553237',
              asset: 'BTC.BTC',
            },
          ],
          height: '14208872',
          txID: '772EAD20ED7D60FBFBA15EEA0DC2CF71DFE945605A4CAED79DB8A852D005E212',
        },
      ],
      pools: [],
      status: 'success',
      type: 'refund',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '142078469000000009',
    prevPageToken: '142078469000000009',
  },
}

export default { tx, actionsResponse }
