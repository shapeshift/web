import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '0xe255bf53cf07d1fdd89691a15c995d8e881dd3ae2fb1f438819498621fb64114',
  blockHash: '0x26a4d0ddcf3fa1b801b113ca3aac74f317be4fd3575cb42476ba34d9c330b8ca',
  blockHeight: 19068567,
  timestamp: 1706003219,
  status: 1,
  from: '0xDE91BbA05160925F0Ef903c2434161bB05Ce9505',
  to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
  confirmations: 9692,
  value: '4353475000000000000',
  fee: '3988400000000000',
  gasLimit: '84000',
  gasUsed: '39884',
  gasPrice: '100000000000',
  inputData:
    '0x574da717000000000000000000000000aaa3bfb53d5d5116faedc5dd457531f8465f78af00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003c6aa672618b300000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000047524546554e443a3946423130453439304146314237363335363343464331324642303845354633324533383746424236333938383834453734324246303137384641443644383800000000000000000000000000000000000000000000000000',
  internalTxs: [
    {
      from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
      to: '0xAAA3bFb53d5D5116FAeDc5Dd457531f8465f78af',
      value: '4353475000000000000',
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1706002574512802534',
      height: '14392678',
      in: [
        {
          address: '0xaaa3bfb53d5d5116faedc5dd457531f8465f78af',
          coins: [
            {
              amount: '436187500',
              asset: 'ETH.ETH',
            },
          ],
          txID: '9FB10E490AF1B763563CFC12FB08E5F32E387FBB6398884E742BF0178FAD6D88',
        },
      ],
      metadata: {
        refund: {
          affiliateAddress: 't',
          affiliateFee: '30',
          memo: '=:ETH.THOR:0xAAA3bFb53d5D5116FAeDc5Dd457531f8465f78af:7463736088132/3/8:t:30',
          networkFees: [
            {
              amount: '8961237289',
              asset: 'ETH.THOR-0XA5F2211B9B8170F694421F2046281775E8468044',
            },
            {
              amount: '840000',
              asset: 'ETH.ETH',
            },
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
          ],
          reason: 'emit asset 4629259142429 less than price limit 4662923820698',
        },
      },
      out: [
        {
          address: 'thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk',
          coins: [
            {
              amount: '1217472603',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14392680',
          txID: '',
        },
        {
          address: '0xaaa3bfb53d5d5116faedc5dd457531f8465f78af',
          coins: [
            {
              amount: '2791851030145',
              asset: 'ETH.THOR-0XA5F2211B9B8170F694421F2046281775E8468044',
            },
          ],
          height: '14392782',
          txID: '528897CC589AF4088E865C12907B0C7C20BFCFCAD007B0F55B759988974DB43D',
        },
        {
          address: '0xaaa3bfb53d5d5116faedc5dd457531f8465f78af',
          coins: [
            {
              amount: '435347500',
              asset: 'ETH.ETH',
            },
          ],
          height: '14392784',
          txID: 'E255BF53CF07D1FDD89691A15C995D8E881DD3AE2FB1F438819498621FB64114',
        },
      ],
      pools: [],
      status: 'success',
      type: 'refund',
    },
    {
      date: '1706002446523711665',
      height: '14392657',
      in: [
        {
          address: '0xaaa3bfb53d5d5116faedc5dd457531f8465f78af',
          coins: [
            {
              amount: '261712500',
              asset: 'ETH.ETH',
            },
          ],
          txID: '9FB10E490AF1B763563CFC12FB08E5F32E387FBB6398884E742BF0178FAD6D88',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: 't',
          affiliateFee: '30',
          isStreamingSwap: false,
          liquidityFee: '79228431',
          memo: '=:ETH.THOR:0xAAA3bFb53d5D5116FAeDc5Dd457531f8465f78af:7463736088132/3/8:t:30',
          networkFees: [
            {
              amount: '8961237289',
              asset: 'ETH.THOR-0XA5F2211B9B8170F694421F2046281775E8468044',
            },
            {
              amount: '840000',
              asset: 'ETH.ETH',
            },
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
          ],
          streamingSwapMeta: {
            count: '8',
            depositedCoin: {
              amount: '697900000',
              asset: 'ETH.ETH',
            },
            inCoin: {
              amount: '261712500',
              asset: 'ETH.ETH',
            },
            interval: '3',
            lastHeight: '14392678',
            outCoin: {
              amount: '2800812267434',
              asset: 'ETH.THOR-0XA5F2211B9B8170F694421F2046281775E8468044',
            },
            quantity: '8',
          },
          swapSlip: '0',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: 'thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk',
          coins: [
            {
              amount: '1217472603',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14392680',
          txID: '',
        },
        {
          address: '0xaaa3bfb53d5d5116faedc5dd457531f8465f78af',
          coins: [
            {
              amount: '2791851030145',
              asset: 'ETH.THOR-0XA5F2211B9B8170F694421F2046281775E8468044',
            },
          ],
          height: '14392782',
          txID: '528897CC589AF4088E865C12907B0C7C20BFCFCAD007B0F55B759988974DB43D',
        },
        {
          address: '0xaaa3bfb53d5d5116faedc5dd457531f8465f78af',
          coins: [
            {
              amount: '435347500',
              asset: 'ETH.ETH',
            },
          ],
          height: '14392784',
          txID: 'E255BF53CF07D1FDD89691A15C995D8E881DD3AE2FB1F438819498621FB64114',
        },
      ],
      pools: [],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '2',
  meta: {
    nextPageToken: '143926579000000028',
    prevPageToken: '143926789000000024',
  },
}

export default { tx, actionsResponse }
