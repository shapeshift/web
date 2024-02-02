import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '5C3F23A36600A0A5079D22D5939BBFA40940C1AEB04497A9F10A38F3A6F89CD1',
  blockHash: '5A7BFF003CE727B8B114B5608341163456FD76B0A3F43DB47F2F3721CD44F308',
  blockHeight: 18806453,
  timestamp: 1705777166,
  confirmations: 126689,
  fee: {
    amount: '6000',
    denom: 'uatom',
  },
  gasUsed: '74870',
  gasWanted: '200000',
  index: 15,
  memo: 'REFUND:CFD82073CB432FDFFA4BB75FE0838A1C28FD966F91E91AD9A421F128AFDC97C2',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos1kfj43sgxqcglc2ydk0v34re523ent6qhmaj4l5',
      from: 'cosmos1kfj43sgxqcglc2ydk0v34re523ent6qhmaj4l5',
      to: 'cosmos1s9t9jkqvwcwh66c4nya5vxnsntew3wrcald960',
      type: 'send',
      value: {
        amount: '125995651',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '125995651uatom',
        receiver: 'cosmos1s9t9jkqvwcwh66c4nya5vxnsntew3wrcald960',
      },
      coin_spent: {
        amount: '125995651uatom',
        spender: 'cosmos1kfj43sgxqcglc2ydk0v34re523ent6qhmaj4l5',
      },
      message: {
        action: '/cosmos.bank.v1beta1.MsgSend',
        module: 'bank',
        sender: 'cosmos1kfj43sgxqcglc2ydk0v34re523ent6qhmaj4l5',
      },
      transfer: {
        amount: '125995651uatom',
        recipient: 'cosmos1s9t9jkqvwcwh66c4nya5vxnsntew3wrcald960',
        sender: 'cosmos1kfj43sgxqcglc2ydk0v34re523ent6qhmaj4l5',
      },
    },
  },
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1705774952807649596',
      height: '14356084',
      in: [
        {
          address: 'cosmos1s9t9jkqvwcwh66c4nya5vxnsntew3wrcald960',
          coins: [
            {
              amount: '12609905672',
              asset: 'GAIA.ATOM',
            },
          ],
          txID: 'CFD82073CB432FDFFA4BB75FE0838A1C28FD966F91E91AD9A421F128AFDC97C2',
        },
      ],
      metadata: {
        refund: {
          affiliateAddress: 'rg',
          affiliateFee: '25',
          memo: '=:ETH.DPI:0x8a021d359e988166b523da637d47671ff34fe909:26129e5/15/53:rg:25',
          networkFees: [
            {
              amount: '5936536',
              asset: 'ETH.DPI-0X1494CA1F11D487C2BBE4543E90080AEBA4BA3C2B',
            },
            {
              amount: '10340500',
              asset: 'GAIA.ATOM',
            },
          ],
          reason: 'emit asset 1195604873 less than price limit 1225126044',
        },
      },
      out: [
        {
          address: '0x8a021d359e988166b523da637d47671ff34fe909',
          coins: [
            {
              amount: '1381837420',
              asset: 'ETH.DPI-0X1494CA1F11D487C2BBE4543E90080AEBA4BA3C2B',
            },
          ],
          height: '14356390',
          txID: '7313745E7AA5E48A176EA746D8B6FCFB9BE05D91E3BC3E9F6AD4D40D2F3C97A9',
        },
        {
          address: 'cosmos1s9t9jkqvwcwh66c4nya5vxnsntew3wrcald960',
          coins: [
            {
              amount: '12599565100',
              asset: 'GAIA.ATOM',
            },
          ],
          height: '14356390',
          txID: '5C3F23A36600A0A5079D22D5939BBFA40940C1AEB04497A9F10A38F3A6F89CD1',
        },
      ],
      pools: [],
      status: 'success',
      type: 'refund',
    },
    {
      date: '1705769301364660626',
      height: '14355304',
      in: [
        {
          address: 'cosmos1s9t9jkqvwcwh66c4nya5vxnsntew3wrcald960',
          coins: [
            {
              amount: '14190094328',
              asset: 'GAIA.ATOM',
            },
          ],
          txID: 'CFD82073CB432FDFFA4BB75FE0838A1C28FD966F91E91AD9A421F128AFDC97C2',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: 'rg',
          affiliateFee: '25',
          isStreamingSwap: true,
          liquidityFee: '16728879',
          memo: '=:ETH.DPI:0x8a021d359e988166b523da637d47671ff34fe909:26129e5/15/53:rg:25',
          networkFees: [
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
            {
              amount: '5936536',
              asset: 'ETH.DPI-0X1494CA1F11D487C2BBE4543E90080AEBA4BA3C2B',
            },
            {
              amount: '10340500',
              asset: 'GAIA.ATOM',
            },
          ],
          streamingSwapMeta: {
            count: '53',
            depositedCoin: {
              amount: '26733000000',
              asset: 'GAIA.ATOM',
            },
            inCoin: {
              amount: '14123094328',
              asset: 'GAIA.ATOM',
            },
            interval: '15',
            lastHeight: '14356084',
            outCoin: {
              amount: '1387773956',
              asset: 'ETH.DPI-0X1494CA1F11D487C2BBE4543E90080AEBA4BA3C2B',
            },
            quantity: '53',
          },
          swapSlip: '0',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: 'thor160ar0d33suh3nc4cd87evq27p3ajklfy6allj5',
          coins: [
            {
              amount: '156031700',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14355304',
          txID: '',
        },
        {
          address: '0x8a021d359e988166b523da637d47671ff34fe909',
          coins: [
            {
              amount: '1381837420',
              asset: 'ETH.DPI-0X1494CA1F11D487C2BBE4543E90080AEBA4BA3C2B',
            },
          ],
          height: '14356390',
          txID: '7313745E7AA5E48A176EA746D8B6FCFB9BE05D91E3BC3E9F6AD4D40D2F3C97A9',
        },
        {
          address: 'cosmos1s9t9jkqvwcwh66c4nya5vxnsntew3wrcald960',
          coins: [
            {
              amount: '12599565100',
              asset: 'GAIA.ATOM',
            },
          ],
          height: '14356390',
          txID: '5C3F23A36600A0A5079D22D5939BBFA40940C1AEB04497A9F10A38F3A6F89CD1',
        },
      ],
      pools: ['GAIA.ATOM', 'ETH.DPI-0X1494CA1F11D487C2BBE4543E90080AEBA4BA3C2B'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '2',
  meta: {
    nextPageToken: '143553049000000001',
    prevPageToken: '143560849000000013',
  },
}

export default { tx, actionsResponse }
