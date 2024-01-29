import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '0x37fda45feded386ee6935041bd57d2d2d1d0bbff11bc5a8447cc83fe1961a552',
  blockHash: '0xe17d203e6d53013c22bd42c0ddec72db867a1e1255b118b5201c7c5ae2b0e9cf',
  blockHeight: 19078371,
  timestamp: 1706121959,
  status: 1,
  from: '0xe50dAEec74B284A620Ef6bFBc7FE43c90b1250Aa',
  to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
  confirmations: 148,
  value: '0',
  fee: '2424210000000000',
  gasLimit: '86462',
  gasUsed: '80807',
  gasPrice: '30000000000',
  inputData:
    '0x574da71700000000000000000000000044f87741f17b0fd8079c258f833708a15205bf72000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000000000000000000000000000000000007abcf923000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000444f55543a4343353130334342464443344632344334384444324335414543463243363935363631334541334146364642373435383230333044454236423846413632393800000000000000000000000000000000000000000000000000000000',
  tokenTransfers: [
    {
      contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
      name: 'Tether USD',
      symbol: 'USDT',
      type: 'ERC20',
      from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
      to: '0x44F87741f17b0fd8079C258F833708a15205BF72',
      value: '2059204899',
    },
  ],
  internalTxs: [],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1706121883843295065',
      height: '14411954',
      in: [
        {
          address: '0x44f87741f17b0fd8079c258f833708a15205bf72',
          coins: [
            {
              amount: '206608556343',
              asset: 'ETH/USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
            },
          ],
          txID: 'CC5103CBFDC4F24C48DD2C5AECF2C6956613EA3AF6FB74582030DEB6B8FA6298',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '25398395',
          memo: '=:ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7:0x44f87741f17b0fd8079c258f833708a15205bf72',
          networkFees: [
            {
              amount: '533041600',
              asset: 'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
            },
          ],
          swapSlip: '6',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: '0x44f87741f17b0fd8079c258f833708a15205bf72',
          coins: [
            {
              amount: '205920489900',
              asset: 'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
            },
          ],
          height: '14411967',
          txID: '37FDA45FEDED386EE6935041BD57D2D2D1D0BBFF11BC5A8447CC83FE1961A552',
        },
      ],
      pools: ['ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7'],
      status: 'success',
      type: 'swap',
    },
    {
      date: '1706121883843295065',
      height: '14411954',
      in: [
        {
          address: '0x44f87741f17b0fd8079c258f833708a15205bf72',
          coins: [
            {
              amount: '1',
              asset: 'ETH.ETH',
            },
          ],
          txID: 'CC5103CBFDC4F24C48DD2C5AECF2C6956613EA3AF6FB74582030DEB6B8FA6298',
        },
      ],
      metadata: {
        withdraw: {
          asymmetry: '0',
          basisPoints: '9900',
          impermanentLossProtection: '0',
          liquidityUnits: '-191944894796',
          memo: '-:ETH/USDT-ec7:9900',
          networkFees: [
            {
              amount: '533041600',
              asset: 'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
            },
          ],
        },
      },
      out: [
        {
          address: '0x44f87741f17b0fd8079c258f833708a15205bf72',
          coins: [
            {
              amount: '205920489900',
              asset: 'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
            },
          ],
          height: '14411967',
          txID: '37FDA45FEDED386EE6935041BD57D2D2D1D0BBFF11BC5A8447CC83FE1961A552',
        },
      ],
      pools: ['ETH/USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7'],
      status: 'success',
      type: 'withdraw',
    },
  ],
  count: '2',
  meta: {
    nextPageToken: '144119541000540005',
    prevPageToken: '144119549000000037',
  },
}

export default { tx, actionsResponse }
