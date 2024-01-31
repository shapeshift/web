import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '0xe775914ef03ef40de45e748cf9c525b8a8bbd46b1c5f0162d110c18987800f02',
  blockHash: '0x9686ad5c169dd4c9f546357a3af727c67a375a1cc71c5046acda3a4dc608a841',
  blockHeight: 18432287,
  timestamp: 1698297839,
  status: 1,
  from: '0x292dcdA0B1f455aeE65FB74f42f8e98a57195b97',
  to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
  confirmations: 653333,
  value: '4997600000000000000',
  fee: '1196160000000000',
  gasLimit: '80000',
  gasUsed: '39872',
  gasPrice: '30000000000',
  inputData:
    '0x574da717000000000000000000000000cc24d4368654599f05b637cdbc935c519a29310c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000455b0ab8b97e000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000047524546554e443a4338413038463342313241334333373145303642424430333630353030323942354239343043323444324641443835463131324443324237353842373442314100000000000000000000000000000000000000000000000000',
  internalTxs: [
    {
      from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
      to: '0xcc24D4368654599f05b637cdBC935c519a29310c',
      value: '4997600000000000000',
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1698297546268558992',
      height: '13173521',
      in: [
        {
          address: '0xcc24d4368654599f05b637cdbc935c519a29310c',
          coins: [
            {
              amount: '500000000',
              asset: 'ETH.ETH',
            },
          ],
          txID: 'C8A08F3B12A3C371E06BBD036050029B5B940C24D2FAD85F112DC2B758B74B1A',
        },
      ],
      metadata: {
        refund: {
          affiliateAddress: '',
          affiliateFee: '0',
          memo: 'loan+:ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7:0xcc24D4368654599f05b637cdBC935c519a29310c:284485549050:thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk:0:::0',
          networkFees: [
            {
              amount: '240000',
              asset: 'ETH.ETH',
            },
          ],
          reason: 'emit asset 284085045900 less than price limit 284485549050',
        },
      },
      out: [
        {
          address: '0xcc24d4368654599f05b637cdbc935c519a29310c',
          coins: [
            {
              amount: '499760000',
              asset: 'ETH.ETH',
            },
          ],
          height: '13173570',
          txID: 'E775914EF03EF40DE45E748CF9C525B8A8BBD46B1C5F0162D110C18987800F02',
        },
      ],
      pools: [],
      status: 'success',
      type: 'refund',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '131735219000000007',
    prevPageToken: '131735219000000007',
  },
}

export default { tx, actionsResponse }
