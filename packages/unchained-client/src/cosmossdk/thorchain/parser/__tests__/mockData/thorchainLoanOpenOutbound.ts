import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: 'D272D82280D6AF4257E26DD4A568E33DE15FB1AFA0330B9591892FB2994848B3',
  blockHash: '772A59E8F65F42CCE9F21A801E5A2FFF871249C8F9DC77081F74F188E9416284',
  blockHeight: 14395665,
  timestamp: 1706020921,
  confirmations: 102704,
  fee: {
    amount: '2000000',
    denom: 'rune',
  },
  gasUsed: '0',
  gasWanted: '0',
  index: -1,
  memo: 'OUT:D272D82280D6AF4257E26DD4A568E33DE15FB1AFA0330B9591892FB2994848B3',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      to: 'thor1cv2cefslwelng58ngql7w6q479tyyal2fl6kwy',
      type: 'outbound',
      value: {
        amount: '3195702946',
        denom: 'rune',
      },
    },
  ],
  events: {
    '0': {
      outbound: {
        chain: 'THOR',
        coin: '3195702946 THOR.RUNE',
        from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
        id: '0000000000000000000000000000000000000000000000000000000000000000',
        in_tx_id: 'D272D82280D6AF4257E26DD4A568E33DE15FB1AFA0330B9591892FB2994848B3',
        memo: 'OUT:D272D82280D6AF4257E26DD4A568E33DE15FB1AFA0330B9591892FB2994848B3',
        to: 'thor1cv2cefslwelng58ngql7w6q479tyyal2fl6kwy',
      },
    },
  },
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1706020921916853029',
      height: '14395665',
      in: [
        {
          address: 'noop',
          coins: [
            {
              amount: '12138170000',
              asset: 'THOR.TOR',
            },
          ],
          txID: 'D272D82280D6AF4257E26DD4A568E33DE15FB1AFA0330B9591892FB2994848B3',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '89955',
          memo: 'noop',
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
          address: 'thor1cv2cefslwelng58ngql7w6q479tyyal2fl6kwy',
          coins: [
            {
              amount: '3195702946',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14395665',
          txID: '',
        },
      ],
      pools: ['THOR.TOR'],
      status: 'success',
      type: 'swap',
    },
    {
      date: '1706020915829455198',
      height: '14395664',
      in: [
        {
          address: '0xdd911a662973a52a65de517a144c48fc57847968',
          coins: [
            {
              amount: '20368806',
              asset: 'ETH.ETH',
            },
          ],
          txID: 'D272D82280D6AF4257E26DD4A568E33DE15FB1AFA0330B9591892FB2994848B3',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '402321',
          memo: 'loan+:THOR.RUNE:thor1cv2cefslwelng58ngql7w6q479tyyal2fl6kwy:0:thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk:0:::0',
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
          address: 'thor1cv2cefslwelng58ngql7w6q479tyyal2fl6kwy',
          coins: [
            {
              amount: '3195702946',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14395665',
          txID: '',
        },
      ],
      pools: ['ETH.ETH', 'THOR.ETH'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '2',
  meta: {
    nextPageToken: '143956649000000060',
    prevPageToken: '143956659000000126',
  },
}

export default { tx, actionsResponse }
