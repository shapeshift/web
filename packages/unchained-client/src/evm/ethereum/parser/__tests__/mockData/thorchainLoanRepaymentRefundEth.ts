import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '0x76e81342cf50aab69cba921cbfcb8ef9ad3a370fb96e2bea8a3eb4f467b32c9b',
  blockHash: '0x0e307e3585807e2138366da601cd639dcac217740d7dbb23ada24bbd7c884ee0',
  blockHeight: 18413651,
  timestamp: 1698072383,
  status: 1,
  from: '0x7d95ADCC106527C9904cDA7F15415b99514EFaEB',
  to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
  confirmations: 671993,
  value: '305222000000000000',
  fee: '2393040000000000',
  gasLimit: '80000',
  gasUsed: '39884',
  gasPrice: '60000000000',
  inputData:
    '0x574da7170000000000000000000000002e2f2a4a49b0c936012af4b67db562ff0e7d10d70000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000043c5dcab7a2600000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000047524546554e443a3444443845454338323944394235444337393130443439383432373242413936333630304241304635333746334543423536354330424330354635383941453600000000000000000000000000000000000000000000000000',
  internalTxs: [
    {
      from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
      to: '0x2E2F2A4a49b0c936012aF4b67db562fF0e7D10d7',
      value: '305222000000000000',
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1698072340307986513',
      height: '13137850',
      in: [
        {
          address: '0x2e2f2a4a49b0c936012af4b67db562ff0e7d10d7',
          coins: [
            {
              amount: '31002200',
              asset: 'ETH.ETH',
            },
          ],
          txID: '4DD8EEC829D9B5DC7910D4984272BA963600BA0F537F3ECB565C0BC05F589AE6',
        },
      ],
      metadata: {
        refund: {
          affiliateAddress: '',
          affiliateFee: '0',
          memo: 'loan-:ETH.ETH:0x2e2f2a4a49b0c936012af4b67db562ff0e7d10d7:74978323',
          networkFees: [
            {
              amount: '480000',
              asset: 'ETH.ETH',
            },
          ],
          reason: 'emit asset 74950077 less than price limit 74978323',
        },
      },
      out: [
        {
          address: '0x2e2f2a4a49b0c936012af4b67db562ff0e7d10d7',
          coins: [
            {
              amount: '30522200',
              asset: 'ETH.ETH',
            },
          ],
          height: '13137859',
          txID: '76E81342CF50AAB69CBA921CBFCB8EF9AD3A370FB96E2BEA8A3EB4F467B32C9B',
        },
      ],
      pools: [],
      status: 'success',
      type: 'refund',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '131378509000000007',
    prevPageToken: '131378509000000007',
  },
}

export default { tx, actionsResponse }
