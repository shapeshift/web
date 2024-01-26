import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '0x6cf85bb31447684089b0bd5acd743d7f3c429c8ebae8ed58e3bfba22c3256858',
  blockHash: '0x3337abdfaaf67b9d5f2d52d3acfad67567a1aae22324c3c5d0eb1f7811bc474b',
  blockHeight: 19077777,
  timestamp: 1706114771,
  status: 1,
  from: '0xB2478c4e33889403F9b7EF73b01E07Cd33395E08',
  to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
  confirmations: 337,
  value: '0',
  fee: '1024126776906440',
  gasLimit: '57796',
  gasUsed: '52534',
  gasPrice: '19494551660',
  inputData:
    '0x574da7170000000000000000000000009c2e658ffc8ea7fad00a4829bd4b554e8a716f730000000000000000000000000bc529c00c6401aef6d220be8c6ea1667f6ad93e00000000000000000000000000000000000000000000000000e8517a3a21680000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000047524546554e443a4645464238343238394634394631383738413236413544433741413033394634354334443630414332313641414345463130383244393946464642453334363800000000000000000000000000000000000000000000000000',
  tokenTransfers: [
    {
      contract: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
      decimals: 18,
      name: 'yearn.finance',
      symbol: 'YFI',
      type: 'ERC20',
      from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
      to: '0x9c2E658ffC8ea7Fad00A4829Bd4B554e8a716f73',
      value: '65391780000000000',
    },
  ],
  internalTxs: [],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1706114739703418123',
      height: '14410795',
      in: [
        {
          address: '0x9c2e658ffc8ea7fad00a4829bd4b554e8a716f73',
          coins: [
            {
              amount: '6576999',
              asset: 'ETH.YFI-0X0BC529C00C6401AEF6D220BE8C6EA1667F6AD93E',
            },
          ],
          txID: 'FEFB84289F49F1878A26A5DC7AA039F45C4D60AC216AACEF1082D99FFFBE3468',
        },
      ],
      metadata: {
        refund: {
          affiliateAddress: '',
          affiliateFee: '0',
          memo: 'SWAP:BSC/BNB:thor166n4w5039meulfa3p6ydg60ve6ueac7tlt0jws:157499274',
          networkFees: [
            {
              amount: '37821',
              asset: 'ETH.YFI-0X0BC529C00C6401AEF6D220BE8C6EA1667F6AD93E',
            },
          ],
          reason: 'emit asset 157377031 less than price limit 157499274',
        },
      },
      out: [
        {
          address: '0x9c2e658ffc8ea7fad00a4829bd4b554e8a716f73',
          coins: [
            {
              amount: '6539178',
              asset: 'ETH.YFI-0X0BC529C00C6401AEF6D220BE8C6EA1667F6AD93E',
            },
          ],
          height: '14410801',
          txID: '6CF85BB31447684089B0BD5ACD743D7F3C429C8EBAE8ED58E3BFBA22C3256858',
        },
      ],
      pools: [],
      status: 'success',
      type: 'refund',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '144107959000000007',
    prevPageToken: '144107959000000007',
  },
}

export default { tx, actionsResponse }
