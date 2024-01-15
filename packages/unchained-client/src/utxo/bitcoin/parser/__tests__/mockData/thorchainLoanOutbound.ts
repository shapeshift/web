import type { ActionsResponse } from '../../../../parser/thorchain'
import type { Tx } from '../../../index'

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
      opReturn: 'OP_RETURN (OUT:5378E62D1426BA399753583F01E8655C508DE22903352D1CAFA10942222CF7A1)',
      scriptPubKey: {
        hex: '6a444f55543a35333738453632443134323642413339393735333538334630314538363535433530384445323239303333353244314341464131303934323232324346374131',
      },
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1704845816294227234',
      height: '14207666',
      in: [
        {
          address: '0x3c896c5163bfaa022b0df3f00613560df247adb4',
          coins: [
            {
              amount: '173556206700',
              asset: 'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
            },
          ],
          txID: '5378E62D1426BA399753583F01E8655C508DE22903352D1CAFA10942222CF7A1',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '39241624',
          memo: 'loan-:BTC.BTC:bc1q269j5rs4rm5tjpvm6adcchhvgmghc4p46250ra:0',
          networkFees: [
            {
              amount: '64500',
              asset: 'BTC.BTC',
            },
          ],
          swapSlip: '11',
          swapTarget: '0',
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
          height: '14208401',
          txID: 'DB19B42A99D5117F8E3B94D4F23E5F02157937F3C4D8371AFD0A56B9DBFA084D',
        },
      ],
      pools: ['ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7', 'THOR.TOR'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '142076669000000016',
    prevPageToken: '142076669000000016',
  },
}

export default { tx, actionsResponse }
