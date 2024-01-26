import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '9fc8843b239a50c1f00c38788c5dea2060c97bb17a5786291751210b78513a8a',
  blockHash: '00000000000000000003d61a48a55bcc1d7aaa2ccb5eb9268f1458bbecc6c9d7',
  blockHeight: 825310,
  timestamp: 1704980055,
  confirmations: 35,
  value: '9744025454',
  fee: '28388',
  hex: '010000000001018658894f728e35b9ebdd568bc3c1772f9d0f98dfca47d8323bd89d225dd1ca300100000000ffffffff0382f30d00000000001600140f7993dc15160828120f5046f2187a7c35780b44ec13bc4402000000160014801c4711208b6e3df236b9f3bbabfae52edcfa020000000000000000466a444f55543a3835434546333138333935384138303536343343364244393331363941433245443330303531433231463139434246354232363136314343354146383936353902483045022100a6044b28ebc262009f64a7cfdf5c750f7afb81d0f2dddd5c582e78b5847802c902206a2659394c823a93dfe1bf33211960507216ce7c5c7fbf9f7f0f60a592d14c35012102ea13b3619f73a04474af18459522b16fa8388f17d4a78393a8302b202c87548300000000',
  vin: [
    {
      txid: '30cad15d229dd83b32d847cadf980f9d2f77c1c38b56ddebb9358e724f895886',
      vout: '1',
      sequence: 4294967295,
      addresses: ['bc1qsqwywyfq3dhrmu3kh8emh2l6u5hde7szxpg99j'],
      value: '9744053842',
    },
  ],
  vout: [
    {
      value: '914306',
      n: 0,
      scriptPubKey: {
        hex: '00140f7993dc15160828120f5046f2187a7c35780b44',
      },
      addresses: ['bc1qpaue8hq4zcyzsys02pr0yxr60s6hsz6yt6h493'],
    },
    {
      value: '9743111148',
      n: 1,
      scriptPubKey: {
        hex: '0014801c4711208b6e3df236b9f3bbabfae52edcfa02',
      },
      addresses: ['bc1qsqwywyfq3dhrmu3kh8emh2l6u5hde7szxpg99j'],
    },
    {
      value: '0',
      n: 2,
      opReturn: 'OP_RETURN (OUT:85CEF3183958A805643C6BD93169AC2ED30051C21F19CBF5B26161CC5AF89659)',
      scriptPubKey: {
        hex: '6a444f55543a38354345463331383339353841383035363433433642443933313639414332454433303035314332314631394342463542323631363143433541463839363539',
      },
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1704979997021299499',
      height: '14228633',
      in: [
        {
          address: 'bc1qpaue8hq4zcyzsys02pr0yxr60s6hsz6yt6h493',
          coins: [
            {
              amount: '10001',
              asset: 'BTC.BTC',
            },
          ],
          txID: '85CEF3183958A805643C6BD93169AC2ED30051C21F19CBF5B26161CC5AF89659',
        },
      ],
      metadata: {
        withdraw: {
          asymmetry: '0',
          basisPoints: '3300',
          impermanentLossProtection: '0',
          liquidityUnits: '-2453933026',
          memo: '-:BTC.BTC:3300',
          networkFees: [
            {
              amount: '151500',
              asset: 'BTC.BTC',
            },
          ],
        },
      },
      out: [
        {
          address: 'bc1qpaue8hq4zcyzsys02pr0yxr60s6hsz6yt6h493',
          coins: [
            {
              amount: '914306',
              asset: 'BTC.BTC',
            },
          ],
          height: '14228641',
          txID: '9FC8843B239A50C1F00C38788C5DEA2060C97BB17A5786291751210B78513A8A',
        },
      ],
      pools: ['BTC.BTC'],
      status: 'success',
      type: 'withdraw',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '142286331000280005',
    prevPageToken: '142286331000280005',
  },
}

export default { tx, actionsResponse }
