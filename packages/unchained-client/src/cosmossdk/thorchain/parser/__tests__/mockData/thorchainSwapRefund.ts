import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '6628AF59FE3F1B783F4A85E51069574CF895FBCCB2F3246CE8392900EFE3A189',
  blockHash: 'ADDB58DFD1E36A9388193D7AADA7B8558472C7D8EF5F9CDD6C1764795550D7FB',
  blockHeight: 14495443,
  timestamp: 1706637057,
  confirmations: 775,
  fee: {
    amount: '2000000',
    denom: 'rune',
  },
  gasUsed: '0',
  gasWanted: '0',
  index: -1,
  memo: 'REFUND:6628AF59FE3F1B783F4A85E51069574CF895FBCCB2F3246CE8392900EFE3A189',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      to: 'thor155aucsw0n50lpdk6cx55cp2qz5txeedru56zml',
      type: 'outbound',
      value: {
        amount: '39503960585',
        denom: 'rune',
      },
    },
  ],
  events: {
    '0': {
      outbound: {
        chain: 'THOR',
        coin: '39503960585 THOR.RUNE',
        from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
        id: '0000000000000000000000000000000000000000000000000000000000000000',
        in_tx_id: '6628AF59FE3F1B783F4A85E51069574CF895FBCCB2F3246CE8392900EFE3A189',
        memo: 'REFUND:6628AF59FE3F1B783F4A85E51069574CF895FBCCB2F3246CE8392900EFE3A189',
        to: 'thor155aucsw0n50lpdk6cx55cp2qz5txeedru56zml',
      },
    },
  },
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1706637057407970703',
      height: '14495443',
      in: [
        {
          address: 'thor155aucsw0n50lpdk6cx55cp2qz5txeedru56zml',
          coins: [
            {
              amount: '39505960585',
              asset: 'THOR.RUNE',
            },
          ],
          txID: '6628AF59FE3F1B783F4A85E51069574CF895FBCCB2F3246CE8392900EFE3A189',
        },
      ],
      metadata: {
        refund: {
          affiliateAddress: 't',
          affiliateFee: '15',
          memo: '=:s:0x89e1b84333f81458f9c2bd01a93fb3e051b68280:598929132:t:15:2E:955:179366952080295394705600',
          networkFees: [
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
          ],
          reason:
            'fail to add outbound tx: 2 errors occurred:\n\t* internal error\n\t* outbound amount does not meet requirements (598680880/598929132)\n\n',
        },
      },
      out: [
        {
          address: 'thor155aucsw0n50lpdk6cx55cp2qz5txeedru56zml',
          coins: [
            {
              amount: '39503960585',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14495443',
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
    nextPageToken: '144954439000000011',
    prevPageToken: '144954439000000011',
  },
}

export default { tx, actionsResponse }
