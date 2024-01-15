import type { ActionsResponse } from '../../../../parser/thorchain'
import type { Tx } from '../../../index'

// NOTE: this is not a real transaction as I was unable to find an actual bitcoin savers refund on chain

const tx: Tx = {
  txid: 'db19b42a99d5117f8e3b94d4f23e5f02157937f3c4d8371afd0a56b9dbfa084d',
  blockHash: '000000000000000000039632dab0444fc966b3effd455154150cb4de84104bff',
  blockHeight: 825076,
  timestamp: 1704851622,
  confirmations: 269,
  value: '36691043911',
  fee: '18236',
  hex: '0100000000010151d7def92332fc9fc89b215da63638ac060c10db7ea831fdf2d0eb5cda36a5230100000000ffffffff03e331e40000000000160014568b2a0e151ee8b9059bd75b8c5eec46d17c543564b4108a08000000160014bfb126731142d711d7a9dbc4065d830d92e7f6e60000000000000000466a444f55543a3533373845363244313432364241333939373533353833463031453836353543353038444532323930333335324431434146413130393432323232434637413102473044022075a2ce69074b2f4bb48e9a75e0fa965a06cf3bfe84cac2e964b242ca29595df50220548018eef12f81f5e49d8216a1938f85c64684f700703d87e13a317c9b0808d7012102e04413afe986a11b20749ed3962058e1c9d8df9816ef399a22f57ab36801055f00000000',
  vin: [
    {
      txid: '23a536da5cebd0f2fd31a87edb100c06ac3836a65d219bc89ffc3223f9ded751',
      vout: '1',
      sequence: 4294967295,
      addresses: ['bc1qh7cjvuc3gtt3r4afm0zqvhvrpkfw0ahxrfwfgu'],
      value: '36691062147',
    },
  ],
  vout: [
    {
      value: '14954979',
      n: 0,
      scriptPubKey: {
        hex: '0014568b2a0e151ee8b9059bd75b8c5eec46d17c5435',
      },
      addresses: ['bc1q269j5rs4rm5tjpvm6adcchhvgmghc4p46250ra'],
    },
    {
      value: '36676088932',
      n: 1,
      scriptPubKey: {
        hex: '0014bfb126731142d711d7a9dbc4065d830d92e7f6e6',
      },
      addresses: ['bc1qh7cjvuc3gtt3r4afm0zqvhvrpkfw0ahxrfwfgu'],
    },
    {
      value: '0',
      n: 2,
      opReturn:
        'OP_RETURN (REFUND:5378E62D1426BA399753583F01E8655C508DE22903352D1CAFA10942222CF7A1)',
      scriptPubKey: {
        hex: '6a444f55543a35333738453632443134323642413339393735333538334630314538363535433530384445323239303333353244314341464131303934323232324346374131',
      },
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1702138875088627651',
      height: '13782524',
      in: [
        {
          address: 'bc1qdvzzsscn056p6k0xe0y05ray32g8a5pzs74qra',
          coins: [
            {
              amount: '15954979',
              asset: 'BTC.BTC',
            },
          ],
          txID: 'DB19B42A99D5117F8E3B94D4F23E5F02157937F3C4D8371AFD0A56B9DBFA084D',
        },
      ],
      metadata: {
        refund: {
          affiliateAddress: '',
          affiliateFee: '0',
          memo: '$+:ETH.ETH:0x8a7eAE0fbd128D33022e9d64D912f9903e0f5fcc:0',
          networkFees: [
            {
              amount: '64500',
              asset: 'BTC.BTC',
            },
          ],
          reason: 'some refund reason',
        },
      },
      out: [
        {
          address: 'bc1q269j5rs4rm5tjpvm6adcchhvgmghc4p46250ra',
          coins: [
            {
              amount: '14954979',
              asset: 'BTC.BTC',
            },
          ],
          height: '13783250',
          txID: 'DB19B42A99D5117F8E3B94D4F23E5F02157937F3C4D8371AFD0A56B9DBFA084D',
        },
      ],
      pools: [],
      status: 'success',
      type: 'refund',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '137825241002020011',
    prevPageToken: '137825241002020011',
  },
}

export default { tx, actionsResponse }
