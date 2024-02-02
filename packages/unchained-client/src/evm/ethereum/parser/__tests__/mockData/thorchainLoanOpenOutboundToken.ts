import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '0x13563efcb121a22baff0ea205bb6e6e8f4bf426238821e8275636816233417db',
  blockHash: '0x0c8b782a3319f8700976052c1fb6679976a5742e8780a765832775a9fbb3219a',
  blockHeight: 18865520,
  timestamp: 1703540999,
  status: 1,
  from: '0x5FBAe6Ac253d18bED896C27490804F51eEDc8039',
  to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
  confirmations: 220058,
  value: '0',
  fee: '1331205488223156',
  gasLimit: '71325',
  gasUsed: '66339',
  gasPrice: '20066710204',
  inputData:
    '0x574da7170000000000000000000000000f55f315617869cbf62bdc4f883d8c0ad90cf63f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000004d816185000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000444f55543a4338303332393732333046413131434539424645314632464332413641304135333437373644463935414544333344463845444536324245304643423236364300000000000000000000000000000000000000000000000000000000',
  tokenTransfers: [
    {
      contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
      name: 'USD Coin',
      symbol: 'USDC',
      type: 'ERC20',
      from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
      to: '0x0F55f315617869cBF62bdc4f883d8C0AD90Cf63f',
      value: '1300324741',
    },
  ],
  internalTxs: [],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1703540755861561801',
      height: '14002058',
      in: [
        {
          address: '0x0f55f315617869cbf62bdc4f883d8c0ad90cf63f',
          coins: [
            {
              amount: '170000000',
              asset: 'ETH.ETH',
            },
          ],
          txID: 'C803297230FA11CE9BFE1F2FC2A6A0A534776DF95AED33DF8EDE62BE0FCB266C',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '15180493',
          memo: 'loan+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48:0x0F55f315617869cBF62bdc4f883d8C0AD90Cf63f:0:thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk:0:::0',
          networkFees: [
            {
              amount: '272114200',
              asset: 'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
            },
          ],
          swapSlip: '2',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: '0x0f55f315617869cbf62bdc4f883d8c0ad90cf63f',
          coins: [
            {
              amount: '130032474100',
              asset: 'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
            },
          ],
          height: '14002097',
          txID: '13563EFCB121A22BAFF0EA205BB6E6E8F4BF426238821E8275636816233417DB',
        },
      ],
      pools: ['ETH.ETH', 'THOR.ETH'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '140020589000000016',
    prevPageToken: '140020589000000016',
  },
}

export default { tx, actionsResponse }
