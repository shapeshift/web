import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '0xaa63928757d84842d2a593a1890fbd6314068af97f062ee4db21d142ab913afd',
  blockHash: '0x629e415de36304f421332dbec1ef3fee0df83146877dafe1b256a9d33fcae8b9',
  blockHeight: 19073432,
  timestamp: 1706062211,
  status: 1,
  from: '0x610c97879CD08D54721fD6CDfA143887778AD8c1',
  to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
  confirmations: 6120,
  value: '5312070540000000000',
  fee: '628310499609704',
  gasLimit: '76105',
  gasUsed: '39848',
  gasPrice: '15767679673',
  inputData:
    '0x574da717000000000000000000000000aa07f696a5eb1c3195b353625be29737419931ad000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000049b84402f6847800000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000444f55543a3041353738333946383741384142433538363534324339413746374537453444374435304138424431433638304145304332393633463644433831383543353200000000000000000000000000000000000000000000000000000000',
  internalTxs: [
    {
      from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
      to: '0xAA07f696a5Eb1C3195B353625be29737419931aD',
      value: '5312070540000000000',
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1706061715898529372',
      height: '14402136',
      in: [
        {
          address: '0xaa07f696a5eb1c3195b353625be29737419931ad',
          coins: [
            {
              amount: '1',
              asset: 'ETH.ETH',
            },
          ],
          txID: '0A57839F87A8ABC586542C9A7F7E7E4D7D50A8BD1C680AE0C2963F6DC8185C52',
        },
      ],
      metadata: {
        withdraw: {
          asymmetry: '0',
          basisPoints: '10000',
          impermanentLossProtection: '0',
          liquidityUnits: '-59663174808',
          memo: '-:ETH.ETH:10000',
          networkFees: [
            {
              amount: '120000',
              asset: 'ETH.ETH',
            },
          ],
        },
      },
      out: [
        {
          address: '0xaa07f696a5eb1c3195b353625be29737419931ad',
          coins: [
            {
              amount: '531207054',
              asset: 'ETH.ETH',
            },
          ],
          height: '14402218',
          txID: 'AA63928757D84842D2A593A1890FBD6314068AF97F062EE4DB21D142AB913AFD',
        },
      ],
      pools: ['ETH.ETH'],
      status: 'success',
      type: 'withdraw',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '144021361000040005',
    prevPageToken: '144021361000040005',
  },
}

export default { tx, actionsResponse }
