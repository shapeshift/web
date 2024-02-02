import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: 'B7C7FD407772A5250F8E9B3D9320F813C26E9AD1AAF43F730C391CE4F8DE5D9E',
  blockHash: 'E3834CEAC628A1BCF4A66DC0B4FB2794E70C850EC20E004D11808EFFBB11899D',
  blockHeight: 18932626,
  timestamp: 1706553943,
  confirmations: 302,
  fee: {
    amount: '3000',
    denom: 'uatom',
  },
  gasUsed: '74803',
  gasWanted: '200000',
  index: 9,
  memo: 'OUT:818B5E84218B3A159EFD4F8DDA6484E005A9CE6558E9C12DD188E323B3E6F180',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos17hvcftcmc772t8e46cm4s2gv2r0m9pnszjcqpy',
      from: 'cosmos17hvcftcmc772t8e46cm4s2gv2r0m9pnszjcqpy',
      to: 'cosmos10hng6437uh2yvjy6ax7dsmhkm0446z224s3ag6',
      type: 'send',
      value: {
        amount: '42366561',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '42366561uatom',
        receiver: 'cosmos10hng6437uh2yvjy6ax7dsmhkm0446z224s3ag6',
      },
      coin_spent: {
        amount: '42366561uatom',
        spender: 'cosmos17hvcftcmc772t8e46cm4s2gv2r0m9pnszjcqpy',
      },
      message: {
        action: '/cosmos.bank.v1beta1.MsgSend',
        module: 'bank',
        sender: 'cosmos17hvcftcmc772t8e46cm4s2gv2r0m9pnszjcqpy',
      },
      transfer: {
        amount: '42366561uatom',
        recipient: 'cosmos10hng6437uh2yvjy6ax7dsmhkm0446z224s3ag6',
        sender: 'cosmos17hvcftcmc772t8e46cm4s2gv2r0m9pnszjcqpy',
      },
    },
  },
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1706553926236981083',
      height: '14481870',
      in: [
        {
          address: '0xcdf073567e47969dfae366e3d434a00aafe0f79f',
          coins: [
            {
              amount: '53544',
              asset: 'ETH.ETH',
            },
          ],
          txID: '818B5E84218B3A159EFD4F8DDA6484E005A9CE6558E9C12DD188E323B3E6F180',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: 't',
          affiliateFee: '30',
          isStreamingSwap: false,
          liquidityFee: '1',
          memo: '=:GAIA.ATOM:cosmos10hng6437uh2yvjy6ax7dsmhkm0446z224s3ag6:4109788100:t:30',
          networkFees: [
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
          address: 'thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk',
          coins: [
            {
              amount: '26300577',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14481870',
          txID: '',
        },
        {
          address: 'cosmos10hng6437uh2yvjy6ax7dsmhkm0446z224s3ag6',
          coins: [
            {
              amount: '4236656100',
              asset: 'GAIA.ATOM',
            },
          ],
          height: '14481876',
          txID: 'B7C7FD407772A5250F8E9B3D9320F813C26E9AD1AAF43F730C391CE4F8DE5D9E',
        },
      ],
      pools: ['ETH.ETH'],
      status: 'success',
      type: 'swap',
    },
    {
      date: '1706553919268972271',
      height: '14481869',
      in: [
        {
          address: '0xcdf073567e47969dfae366e3d434a00aafe0f79f',
          coins: [
            {
              amount: '17794392',
              asset: 'ETH.ETH',
            },
          ],
          txID: '818B5E84218B3A159EFD4F8DDA6484E005A9CE6558E9C12DD188E323B3E6F180',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: 't',
          affiliateFee: '30',
          isStreamingSwap: false,
          liquidityFee: '2373691',
          memo: '=:GAIA.ATOM:cosmos10hng6437uh2yvjy6ax7dsmhkm0446z224s3ag6:4109788100:t:30',
          networkFees: [
            {
              amount: '10376600',
              asset: 'GAIA.ATOM',
            },
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
          ],
          swapSlip: '2',
          swapTarget: '4109788100',
        },
      },
      out: [
        {
          address: 'thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk',
          coins: [
            {
              amount: '26300577',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14481870',
          txID: '',
        },
        {
          address: 'cosmos10hng6437uh2yvjy6ax7dsmhkm0446z224s3ag6',
          coins: [
            {
              amount: '4236656100',
              asset: 'GAIA.ATOM',
            },
          ],
          height: '14481876',
          txID: 'B7C7FD407772A5250F8E9B3D9320F813C26E9AD1AAF43F730C391CE4F8DE5D9E',
        },
      ],
      pools: ['ETH.ETH', 'GAIA.ATOM'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '2',
  meta: {
    nextPageToken: '144818699000000100',
    prevPageToken: '144818709000000147',
  },
}

export default { tx, actionsResponse }
