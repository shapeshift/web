import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '0x77b3683104413afcf8548dd949ebb99a6c18fb7d459bf944733fd815c98e5087',
  blockHash: '0x3594abf55e237072408399bc83afa438dc067f01910bf820ea1f05a3ea971f4b',
  blockHeight: 12544372,
  timestamp: 1622494272,
  status: 1,
  from: '0xC42effB5968C2105FEFf5c2ed61135fF68736F10',
  to: '0x42A5Ed456650a09Dc10EBc6361A7480fDd61f27B',
  confirmations: 6527855,
  value: '1579727090000000000',
  fee: '2331480000000000',
  gasLimit: '80000',
  gasUsed: '38858',
  gasPrice: '60000000000',
  inputData:
    '0x574da7170000000000000000000000005a8c5afbcc1a58ccbe17542957b587f46828b38e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000015ec516b2982f400000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000444f55543a3843383539424135304243323335313739374635324639353439373145314336424131463041373736313041433139374244393943344545433641333639324100000000000000000000000000000000000000000000000000000000',
  internalTxs: [
    {
      from: '0x42A5Ed456650a09Dc10EBc6361A7480fDd61f27B',
      to: '0x5a8C5afbCC1A58cCbe17542957b587F46828B38E',
      value: '1579727090000000000',
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1622494265172776247',
      height: '800440',
      in: [
        {
          address: '0x5a8c5afbcc1a58ccbe17542957b587f46828b38e',
          coins: [
            {
              amount: '417377389800',
              asset: 'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
            },
          ],
          txID: '8C859BA50BC2351797F52F954971E1C6BA1F0A77610AC197BD99C4EEC6A3692A',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '70840351',
          memo: 'SWAP:ETH.ETH:0x5a8c5afbcc1a58ccbe17542957b587f46828b38e:151020111',
          networkFees: [
            {
              amount: '960000',
              asset: 'ETH.ETH',
            },
          ],
          swapSlip: '21',
          swapTarget: '151020111',
        },
      },
      out: [
        {
          address: '0x5a8c5afbcc1a58ccbe17542957b587f46828b38e',
          coins: [
            {
              amount: '157972709',
              asset: 'ETH.ETH',
            },
          ],
          height: '800451',
          txID: '77B3683104413AFCF8548DD949EBB99A6C18FB7D459BF944733FD815C98E5087',
        },
      ],
      pools: ['ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48', 'ETH.ETH'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '8004409000000005',
    prevPageToken: '8004409000000005',
  },
}

export default { tx, actionsResponse }
