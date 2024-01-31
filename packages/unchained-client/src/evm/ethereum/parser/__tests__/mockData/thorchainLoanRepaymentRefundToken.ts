import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '0x8df588baadea3bb0a102fa84a2e7d43a12b3a2fdf32c3131cae740f1f83af1fb',
  blockHash: '0xa8f385b207af13916007d46dcb9b2c14d6edf90d468cd4ec6de6760136d50e3c',
  blockHeight: 18750206,
  timestamp: 1702143515,
  status: 1,
  from: '0x2824f99706E0400CF56252C478C1C77724F2A8EE',
  to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
  confirmations: 335448,
  value: '0',
  fee: '4646250000000000',
  gasLimit: '71361',
  gasUsed: '66375',
  gasPrice: '70000000000',
  inputData:
    '0x574da7170000000000000000000000008a7eae0fbd128d33022e9d64d912f9903e0f5fcc000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000069932c000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000047524546554e443a3932363237313133444332344132364131444133334439313834434134443039363936323844373246423242333637354630314641414236454636453644453700000000000000000000000000000000000000000000000000',
  tokenTransfers: [
    {
      contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
      name: 'USD Coin',
      symbol: 'USDC',
      type: 'ERC20',
      from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
      to: '0x8a7eAE0fbd128D33022e9d64D912f9903e0f5fcc',
      value: '110703296',
    },
  ],
  internalTxs: [],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1702138875088627651',
      height: '13782524',
      in: [
        {
          address: '0x8a7eae0fbd128d33022e9d64d912f9903e0f5fcc',
          coins: [
            {
              amount: '13053416600',
              asset: 'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
            },
          ],
          txID: '92627113DC24A26A1DA33D9184CA4D0969628D72FB2B3675F01FAAB6EF6E6DE7',
        },
      ],
      metadata: {
        refund: {
          affiliateAddress: '',
          affiliateFee: '0',
          memo: '$-:ETH.ETH:0x8a7eAE0fbd128D33022e9d64D912f9903e0f5fcc:1',
          networkFees: [
            {
              amount: '1983087000',
              asset: 'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
            },
          ],
          reason: 'loan contains no collateral to redeem',
        },
      },
      out: [
        {
          address: '0x8a7eae0fbd128d33022e9d64d912f9903e0f5fcc',
          coins: [
            {
              amount: '11070329600',
              asset: 'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
            },
          ],
          height: '13783250',
          txID: '8DF588BAADEA3BB0A102FA84A2E7D43A12B3A2FDF32C3131CAE740F1F83AF1FB',
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
