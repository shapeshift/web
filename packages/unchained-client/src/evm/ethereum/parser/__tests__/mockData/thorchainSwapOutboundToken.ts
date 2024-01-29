import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '0x21c32222d4a9e2a876cdf5b2548b5186d6ac871028e3497525a44d99743aae7d',
  blockHash: '0x5a0166d56b77e5a8167d8c7fe083173ddf226a65176cdd529a4baa922812affb',
  blockHeight: 12478650,
  timestamp: 1621613233,
  status: 1,
  from: '0x2Ab5a16737bd4449Cc5c096598b3D2e32add0EF0',
  to: '0x42A5Ed456650a09Dc10EBc6361A7480fDd61f27B',
  confirmations: 6599362,
  value: '0',
  fee: '37199999999936725',
  gasLimit: '82915',
  gasUsed: '82915',
  gasPrice: '448652234215',
  inputData:
    '0x574da7170000000000000000000000005a8c5afbcc1a58ccbe17542957b587f46828b38e000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000b14f88558000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000444f55543a4633414334453930414235393531414239464542313731354234383134323242393034413430423046363735334343383434453332364231323133434637304500000000000000000000000000000000000000000000000000000000',
  tokenTransfers: [
    {
      contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
      name: 'USD Coin',
      symbol: 'USDC',
      type: 'ERC20',
      from: '0x42A5Ed456650a09Dc10EBc6361A7480fDd61f27B',
      to: '0x5a8C5afbCC1A58cCbe17542957b587F46828B38E',
      value: '47596471640',
    },
  ],
  internalTxs: [],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1621613224878658002',
      height: '642927',
      in: [
        {
          address: 'thor1hhjupkzy3t6ccelhz7qw8epyx4rm8a06nlm5ce',
          coins: [
            {
              amount: '510423341825',
              asset: 'THOR.RUNE',
            },
          ],
          txID: 'F3AC4E90AB5951AB9FEB1715B481422B904A40B0F6753CC844E326B1213CF70E',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '11745645806',
          memo: 'SWAP:ETH.USDC-B48:0x5a8c5afbcc1a58ccbe17542957b587f46828b38e:5292633914111',
          networkFees: [
            {
              amount: '17751276300',
              asset: 'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
            },
            {
              amount: '17751276300',
              asset: 'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
            },
          ],
          swapSlip: '236',
          swapTarget: '5292633914111',
        },
      },
      out: [
        {
          address: '0x5a8c5afbcc1a58ccbe17542957b587f46828b38e',
          coins: [
            {
              amount: '4759647164000',
              asset: 'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
            },
          ],
          height: '642940',
          txID: '21C32222D4A9E2A876CDF5B2548B5186D6AC871028E3497525A44D99743AAE7D',
        },
        {
          address: '0x5a8c5afbcc1a58ccbe17542957b587f46828b38e',
          coins: [
            {
              amount: '776064477500',
              asset: 'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
            },
          ],
          height: '642940',
          txID: '43548D7F9D95983C8D956FA98EE1DB1AF326C9E5943C47F747DF06DDB7742C25',
        },
      ],
      pools: ['ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '6429279000000005',
    prevPageToken: '6429279000000005',
  },
}

export default { tx, actionsResponse }
