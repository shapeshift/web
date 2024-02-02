import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '0BB1C342AA5C5834F51BB77FFBA8462BB025274357683A68B07C55536AD6E5D5',
  blockHash: '4CDC58AAF17EE9E3753040DAD12431A1ADBD41F067614C093C26B5A63AF52DAA',
  blockHeight: 14495980,
  timestamp: 1706640328,
  confirmations: 94,
  fee: {
    amount: '2000000',
    denom: 'rune',
  },
  gasUsed: '0',
  gasWanted: '0',
  index: -1,
  memo: 'OUT:0BB1C342AA5C5834F51BB77FFBA8462BB025274357683A68B07C55536AD6E5D5',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      to: 'thor1f6l25d5zech60d036e57t3vkqh3gs7qsrsp08w',
      type: 'outbound',
      value: {
        amount: '21147787600',
        denom: 'rune',
      },
    },
  ],
  events: {
    '0': {
      outbound: {
        chain: 'THOR',
        coin: '21147787600 THOR.RUNE',
        from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
        id: '0000000000000000000000000000000000000000000000000000000000000000',
        in_tx_id: '0BB1C342AA5C5834F51BB77FFBA8462BB025274357683A68B07C55536AD6E5D5',
        memo: 'OUT:0BB1C342AA5C5834F51BB77FFBA8462BB025274357683A68B07C55536AD6E5D5',
        to: 'thor1f6l25d5zech60d036e57t3vkqh3gs7qsrsp08w',
      },
    },
  },
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1706640328200491113',
      height: '14495980',
      in: [
        {
          address: '0x890e5b24b6dd00340b63c4fe845b8ecaede5ebfe',
          coins: [
            {
              amount: '300000000',
              asset: 'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
            },
          ],
          txID: '0BB1C342AA5C5834F51BB77FFBA8462BB025274357683A68B07C55536AD6E5D5',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: 't',
          affiliateFee: '30',
          isStreamingSwap: false,
          liquidityFee: '19',
          memo: '=:r:thor1f6l25d5zech60d036e57t3vkqh3gs7qsrsp08w:21030698597:t:30',
          networkFees: [
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
          ],
          swapSlip: '0',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: 'thor1f6l25d5zech60d036e57t3vkqh3gs7qsrsp08w',
          coins: [
            {
              amount: '21147787600',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14495980',
          txID: '',
        },
        {
          address: 'thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk',
          coins: [
            {
              amount: '61640200',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14495980',
          txID: '',
        },
      ],
      pools: ['ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48'],
      status: 'success',
      type: 'swap',
    },
    {
      date: '1706640328200491113',
      height: '14495980',
      in: [
        {
          address: '0x890e5b24b6dd00340b63c4fe845b8ecaede5ebfe',
          coins: [
            {
              amount: '99700000000',
              asset: 'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
            },
          ],
          txID: '0BB1C342AA5C5834F51BB77FFBA8462BB025274357683A68B07C55536AD6E5D5',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: 't',
          affiliateFee: '30',
          isStreamingSwap: false,
          liquidityFee: '2124035',
          memo: '=:r:thor1f6l25d5zech60d036e57t3vkqh3gs7qsrsp08w:21030698597:t:30',
          networkFees: [
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
          ],
          swapSlip: '1',
          swapTarget: '21030698597',
        },
      },
      out: [
        {
          address: 'thor1f6l25d5zech60d036e57t3vkqh3gs7qsrsp08w',
          coins: [
            {
              amount: '21147787600',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14495980',
          txID: '',
        },
        {
          address: 'thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk',
          coins: [
            {
              amount: '61640200',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14495980',
          txID: '',
        },
      ],
      pools: ['ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '2',
  meta: {
    nextPageToken: '144959809000000001',
    prevPageToken: '144959809000000012',
  },
}

export default { tx, actionsResponse }
