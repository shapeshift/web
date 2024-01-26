import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '0xf6b7cb76ae58c5e9d523d94f7953d71bdbafb054d3ae7d580984105ef6102724',
  blockHash: '0xd0bc8455cd8d2aab84a2cccce87cfe755fb825584838cfee8416a6625d2140ab',
  blockHeight: 19077635,
  timestamp: 1706113055,
  status: 1,
  from: '0xDE91BbA05160925F0Ef903c2434161bB05Ce9505',
  to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
  confirmations: 818,
  value: '7399090000000000',
  fee: '1195080000000000',
  gasLimit: '80000',
  gasUsed: '39836',
  gasPrice: '30000000000',
  inputData:
    '0x574da7170000000000000000000000002e3e405055d7781cb49716726001aac26d3f6fc80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a496ee31c7400000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000444f55543a3630443443383039464336423146453539373631323033373539454341344541423845324545433930463235353933463044454246304441413738434443333600000000000000000000000000000000000000000000000000000000',
  internalTxs: [
    {
      from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
      to: '0x2e3E405055d7781cB49716726001AaC26d3F6FC8',
      value: '7399090000000000',
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1706113022991654206',
      height: '14410514',
      in: [
        {
          address: '0x2e3e405055d7781cb49716726001aac26d3f6fc8',
          coins: [
            {
              amount: '979912',
              asset: 'ETH/ETH',
            },
          ],
          txID: '60D4C809FC6B1FE59761203759ECA4EAB8E2EEC90F25593F0DEBF0DAA78CDC36',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '426',
          memo: '=:ETH.ETH:0x2e3e405055d7781cb49716726001aac26d3f6fc8',
          networkFees: [
            {
              amount: '240000',
              asset: 'ETH.ETH',
            },
          ],
          swapSlip: '0',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: '0x2e3e405055d7781cb49716726001aac26d3f6fc8',
          coins: [
            {
              amount: '739909',
              asset: 'ETH.ETH',
            },
          ],
          height: '14410520',
          txID: 'F6B7CB76AE58C5E9D523D94F7953D71BDBAFB054D3AE7D580984105EF6102724',
        },
      ],
      pools: ['ETH.ETH'],
      status: 'success',
      type: 'swap',
    },
    {
      date: '1706113022991654206',
      height: '14410514',
      in: [
        {
          address: '0x2e3e405055d7781cb49716726001aac26d3f6fc8',
          coins: [
            {
              amount: '1',
              asset: 'ETH.ETH',
            },
          ],
          txID: '60D4C809FC6B1FE59761203759ECA4EAB8E2EEC90F25593F0DEBF0DAA78CDC36',
        },
      ],
      metadata: {
        withdraw: {
          asymmetry: '0',
          basisPoints: '5000',
          impermanentLossProtection: '0',
          liquidityUnits: '-912622',
          memo: '-:ETH/ETH:5000',
          networkFees: [
            {
              amount: '240000',
              asset: 'ETH.ETH',
            },
          ],
        },
      },
      out: [
        {
          address: '0x2e3e405055d7781cb49716726001aac26d3f6fc8',
          coins: [
            {
              amount: '739909',
              asset: 'ETH.ETH',
            },
          ],
          height: '14410520',
          txID: 'F6B7CB76AE58C5E9D523D94F7953D71BDBAFB054D3AE7D580984105EF6102724',
        },
      ],
      pools: ['ETH/ETH'],
      status: 'success',
      type: 'withdraw',
    },
  ],
  count: '2',
  meta: {
    nextPageToken: '144105141000660005',
    prevPageToken: '144105149000000008',
  },
}

export default { tx, actionsResponse }
