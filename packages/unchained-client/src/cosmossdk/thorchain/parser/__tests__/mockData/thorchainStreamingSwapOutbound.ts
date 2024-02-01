import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: 'CC07D5BC49E769EAC4373AE3E02D5670D7F08FACE2F50E895CE32F8B6336A341',
  blockHash: 'AB7016C3D457E3B72DF14BFE41BB790BC51AF35BE738EB94EBA8B76ECF4EFF18',
  blockHeight: 14495994,
  timestamp: 1706640413,
  confirmations: 626,
  fee: {
    amount: '2000000',
    denom: 'rune',
  },
  gasUsed: '0',
  gasWanted: '0',
  index: -1,
  memo: 'OUT:CC07D5BC49E769EAC4373AE3E02D5670D7F08FACE2F50E895CE32F8B6336A341',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      to: 'thor1jgrk28l7fq3gat2nmu3qv580mz043r2fmhxq8e',
      type: 'outbound',
      value: {
        amount: '1058315400',
        denom: 'rune',
      },
    },
  ],
  events: {
    '0': {
      outbound: {
        chain: 'THOR',
        coin: '1058315400 THOR.RUNE',
        from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
        id: '0000000000000000000000000000000000000000000000000000000000000000',
        in_tx_id: 'CC07D5BC49E769EAC4373AE3E02D5670D7F08FACE2F50E895CE32F8B6336A341',
        memo: 'OUT:CC07D5BC49E769EAC4373AE3E02D5670D7F08FACE2F50E895CE32F8B6336A341',
        to: 'thor1jgrk28l7fq3gat2nmu3qv580mz043r2fmhxq8e',
      },
    },
  },
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1706640413099189815',
      height: '14495994',
      in: [
        {
          address: 'thor1y9eseqs87jx94z00umc5f7tkphvhvvva7arzwf',
          coins: [
            {
              amount: '5000000000',
              asset: 'ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
            },
          ],
          txID: 'CC07D5BC49E769EAC4373AE3E02D5670D7F08FACE2F50E895CE32F8B6336A341',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: 'dx',
          affiliateFee: '0',
          isStreamingSwap: true,
          liquidityFee: '5328',
          memo: '=:THOR.RUNE:thor1jgrk28l7fq3gat2nmu3qv580mz043r2fmhxq8e:0/1/0:dx:0',
          networkFees: [
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
          ],
          streamingSwapMeta: {
            count: '1',
            depositedCoin: {
              amount: '5000000000',
              asset: 'ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
            },
            inCoin: {
              amount: '5000000000',
              asset: 'ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
            },
            interval: '1',
            lastHeight: '14495994',
            outCoin: {
              amount: '1060315400',
              asset: 'THOR.RUNE',
            },
            quantity: '1',
          },
          swapSlip: '0',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: 'thor1jgrk28l7fq3gat2nmu3qv580mz043r2fmhxq8e',
          coins: [
            {
              amount: '1058315400',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14495994',
          txID: '',
        },
      ],
      pools: ['ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '144959949000000008',
    prevPageToken: '144959949000000008',
  },
}

export default { tx, actionsResponse }
