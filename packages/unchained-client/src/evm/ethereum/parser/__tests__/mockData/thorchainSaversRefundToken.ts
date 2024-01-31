import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

// NOTE: this is not a real transaction

const tx: Tx = {
  txid: '0x5cd4b52d28e57da315402d5bea6dee07dc3d3ebab77562e0f77d46ec50766158',
  blockHash: '0xf4856cb0870dc7567b2bf4c9a1143843622f6b55fbbfcee94bdcba543c9d18eb',
  blockHeight: 19077551,
  timestamp: 1706112047,
  status: 1,
  from: '0x5C04b555E86507742455b280A4F6436cC43af314',
  to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
  confirmations: 919,
  value: '939834410000000000',
  fee: '1196520000000000',
  gasLimit: '80000',
  gasUsed: '39884',
  gasPrice: '30000000000',
  inputData:
    '0x574da717000000000000000000000000c49066c93521a32135574656573458be11dba05b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d0af66a9bbd240000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000047524546554e443a3832333841374534353932354435413239383242394237323437324544363431423731304343423735373241463742333239373939393236333932374430433400000000000000000000000000000000000000000000000000',
  tokenTransfers: [
    {
      contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
      name: 'Tether USD',
      symbol: 'USDT',
      type: 'ERC20',
      from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
      to: '0xc49066C93521a32135574656573458bE11dBA05B',
      value: '2059204899',
    },
  ],
  internalTxs: [],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1706111982527513001',
      height: '14410344',
      in: [
        {
          address: '0xc49066c93521a32135574656573458be11dba05b',
          coins: [
            {
              amount: '206608556343',
              asset: 'ETH/USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
            },
          ],
          txID: '8238A7E45925D5A2982B9B72472ED641B710CCB7572AF7B3297999263927D0C4',
        },
      ],
      metadata: {
        refund: {
          affiliateAddress: 'thor1a427q3v96psuj4fnughdw8glt5r7j38lj7rkp8',
          affiliateFee: '100',
          memo: '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0',
          networkFees: [
            {
              amount: '533041600',
              asset: 'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
            },
          ],
          reason:
            'memo paired address must be non-empty and together with origin address match the liquidity provider record',
        },
      },
      out: [
        {
          address: '0xc49066c93521a32135574656573458be11dba05b',
          coins: [
            {
              amount: '205920489900',
              asset: 'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
            },
          ],
          height: '14410356',
          txID: '5CD4B52D28E57DA315402D5BEA6DEE07DC3D3EBAB77562E0F77D46EC50766158',
        },
      ],
      pools: [],
      status: 'success',
      type: 'refund',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '144103449000000007',
    prevPageToken: '144103449000000007',
  },
}

export default { tx, actionsResponse }
