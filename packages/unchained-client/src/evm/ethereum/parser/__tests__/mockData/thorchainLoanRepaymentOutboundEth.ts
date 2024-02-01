import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '0x3da994ca884c4a32b6e6b9039ca3595fe14b86684785571ec3570f9f10e8dec7',
  blockHash: '0xd9500ea6e287d042a9d4e42343b5848dd4a29204b7d33c99c92579284734b920',
  blockHeight: 19075128,
  timestamp: 1706082755,
  status: 1,
  from: '0x610c97879CD08D54721fD6CDfA143887778AD8c1',
  to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
  confirmations: 10406,
  value: '1008315360000000000',
  fee: '538262473801232',
  gasLimit: '88836',
  gasUsed: '39848',
  gasPrice: '13507891834',
  inputData:
    '0x574da7170000000000000000000000006293eb0863c083819731eb329940a9b931cd9cd900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000dfe417a465ec000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000444f55543a4245343639424432414645374335383936454445374434384241423838464538414246384443453932303741414330344645424437343641374234333431374400000000000000000000000000000000000000000000000000000000',
  internalTxs: [
    {
      from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
      to: '0x6293Eb0863C083819731eB329940a9b931cd9Cd9',
      value: '1008315360000000000',
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1706082279166275238',
      height: '14405498',
      in: [
        {
          address: '0x6293eb0863c083819731eb329940a9b931cd9cd9',
          coins: [
            {
              amount: '75170693700',
              asset: 'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
            },
          ],
          txID: 'BE469BD2AFE7C5896EDE7D48BAB88FE8ABF8DCE9207AAC04FEBD746A7B43417D',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '4402721',
          memo: 'loan-:ETH.ETH:0x6293eb0863c083819731eb329940a9b931cd9cd9:0',
          networkFees: [
            {
              amount: '120000',
              asset: 'ETH.ETH',
            },
          ],
          swapSlip: '2',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: '0x6293eb0863c083819731eb329940a9b931cd9cd9',
          coins: [
            {
              amount: '100831536',
              asset: 'ETH.ETH',
            },
          ],
          height: '14405576',
          txID: '3DA994CA884C4A32B6E6B9039CA3595FE14B86684785571EC3570F9F10E8DEC7',
        },
      ],
      pools: ['ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7', 'THOR.TOR'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '144054989000000018',
    prevPageToken: '144054989000000018',
  },
}

export default { tx, actionsResponse }
