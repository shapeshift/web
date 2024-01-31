import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '0xec3c0c3e8a93feef9b6b7c44ba17a2cc440bad717e1e8fa8790b1ca100e7a757',
  blockHash: '0x767dc1d9126c9cfecad43fa5b7386fc7b25ebf6a23295c36dec4a9c2a88d12d2',
  blockHeight: 19067693,
  timestamp: 1705992515,
  status: 1,
  from: '0xDE91BbA05160925F0Ef903c2434161bB05Ce9505',
  to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
  confirmations: 17583,
  value: '0',
  fee: '1157710626605182',
  gasLimit: '86462',
  gasUsed: '80807',
  gasPrice: '14326860626',
  inputData:
    '0x574da717000000000000000000000000c1a256a031a8d2938e1fa6782cf4a7411f5f0d73000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec700000000000000000000000000000000000000000000000000000000064c4c23000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000444f55543a3532354443363833463345373941334344334135313242453736393239443143353833393532353238343933433731413944363844443745434145453930313900000000000000000000000000000000000000000000000000000000',
  tokenTransfers: [
    {
      contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
      name: 'Tether USD',
      symbol: 'USDT',
      type: 'ERC20',
      from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
      to: '0xc1a256a031A8D2938e1fa6782cf4a7411f5F0d73',
      value: '105663523',
    },
  ],
  internalTxs: [],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1705985944894230354',
      height: '14389985',
      in: [
        {
          address: '0xc1a256a031a8d2938e1fa6782cf4a7411f5f0d73',
          coins: [
            {
              amount: '1',
              asset: 'ETH.ETH',
            },
          ],
          txID: '525DC683F3E79A3CD3A512BE76929D1C583952528493C71A9D68DD7ECAEE9019',
        },
      ],
      metadata: {
        withdraw: {
          asymmetry: '0',
          basisPoints: '10000',
          impermanentLossProtection: '0',
          liquidityUnits: '-455855262',
          memo: '-:ETH.USDT:10000',
          networkFees: [
            {
              amount: '286516500',
              asset: 'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
            },
          ],
        },
      },
      out: [
        {
          address: '0xc1a256a031a8d2938e1fa6782cf4a7411f5f0d73',
          coins: [
            {
              amount: '10566352300',
              asset: 'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
            },
          ],
          height: '14391043',
          txID: 'EC3C0C3E8A93FEEF9B6B7C44BA17A2CC440BAD717E1E8FA8790B1CA100E7A757',
        },
      ],
      pools: ['ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7'],
      status: 'success',
      type: 'withdraw',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '143899851000700005',
    prevPageToken: '143899851000700005',
  },
}

export default { tx, actionsResponse }
