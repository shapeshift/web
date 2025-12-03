import type { ActionsResponse } from '../../../../../parser/mayachain'
import type { Tx } from '../../../../types'

const tx: Tx = {
  txid: 'DD08D4EF686857E97C7134226996AF590E2CDE0015E8961347D3A668CCF99106',
  blockHash: '8EF0222EA5E5F9BD8AE25092E26DAF0065DFBF320381051461C939492D809AB0',
  blockHeight: 11270785,
  timestamp: 1747938125,
  confirmations: 438593,
  fee: {
    amount: '2000000000',
    denom: 'cacao',
  },
  gasUsed: '0',
  gasWanted: '0',
  index: -1,
  memo: 'REFUND:DD08D4EF686857E97C7134226996AF590E2CDE0015E8961347D3A668CCF99106',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl',
      from: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl',
      to: 'maya18z343fsdlav47chtkyp0aawqt6sgxsh3vjy2vz',
      type: 'outbound',
      value: {
        amount: '6303170239596',
        denom: 'cacao',
      },
    },
  ],
  events: {
    '0': {
      outbound: {
        chain: 'MAYA',
        coin: '6303170239596 MAYA.CACAO',
        from: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl',
        id: '0000000000000000000000000000000000000000000000000000000000000000',
        in_tx_id: 'DD08D4EF686857E97C7134226996AF590E2CDE0015E8961347D3A668CCF99106',
        memo: 'REFUND:DD08D4EF686857E97C7134226996AF590E2CDE0015E8961347D3A668CCF99106',
        to: 'maya18z343fsdlav47chtkyp0aawqt6sgxsh3vjy2vz',
      },
    },
  },
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1747938125733066387',
      height: '11270785',
      in: [
        {
          address: 'maya18z343fsdlav47chtkyp0aawqt6sgxsh3vjy2vz',
          coins: [
            {
              amount: '6305170239596',
              asset: 'MAYA.CACAO',
            },
          ],
          txID: 'DD08D4EF686857E97C7134226996AF590E2CDE0015E8961347D3A668CCF99106',
        },
      ],
      metadata: {
        refund: {
          affiliateAddress: '',
          affiliateFee: '0',
          memo: '=:z:t1QLmq7VDqCBwq9rfVGcANZTQ3ZhNJ5orA2:3002404230',
          networkFees: [
            {
              amount: '2000000000',
              asset: 'MAYA.CACAO',
            },
          ],
          reason: 'emit asset 302898722 less than price limit 3002404230',
        },
      },
      out: [
        {
          address: 'maya18z343fsdlav47chtkyp0aawqt6sgxsh3vjy2vz',
          coins: [
            {
              amount: '6303170239596',
              asset: 'MAYA.CACAO',
            },
          ],
          height: '11270785',
          txID: '',
        },
      ],
      pools: [],
      status: 'success',
      type: 'refund',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '112707859000000019',
    prevPageToken: '112707859000000019',
  },
}

export default { tx, actionsResponse }
