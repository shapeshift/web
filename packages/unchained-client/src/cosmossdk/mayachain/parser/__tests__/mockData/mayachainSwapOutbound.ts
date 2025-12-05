import type { ActionsResponse } from '../../../../../parser/mayachain'
import type { Tx } from '../../../../types'

const tx: Tx = {
  txid: 'DFC6E5DF9FCBB7E62E1B69FB8D40E8F803E2958064C4337FD19C1BFF48D0D0B6',
  blockHash: 'C9CE7303D3DA1368EC6D6F1C1B0D13129DFEF094AC3F9E7DDB1407FFAD1AA289',
  blockHeight: 11679959,
  timestamp: 1750277934,
  confirmations: 28324,
  fee: {
    amount: '2000000000',
    denom: 'cacao',
  },
  gasUsed: '0',
  gasWanted: '0',
  index: -1,
  memo: 'OUT:DFC6E5DF9FCBB7E62E1B69FB8D40E8F803E2958064C4337FD19C1BFF48D0D0B6',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl',
      from: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl',
      to: 'maya17wlyzcfr36dt0uvflrmghpclwlvcml2zzfqzjt',
      type: 'outbound',
      value: {
        amount: '22372670383519',
        denom: 'cacao',
      },
    },
  ],
  events: {
    '0': {
      outbound: {
        chain: 'MAYA',
        coin: '22372670383519 MAYA.CACAO',
        from: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl',
        id: '0000000000000000000000000000000000000000000000000000000000000000',
        in_tx_id: 'DFC6E5DF9FCBB7E62E1B69FB8D40E8F803E2958064C4337FD19C1BFF48D0D0B6',
        memo: 'OUT:DFC6E5DF9FCBB7E62E1B69FB8D40E8F803E2958064C4337FD19C1BFF48D0D0B6',
        to: 'maya17wlyzcfr36dt0uvflrmghpclwlvcml2zzfqzjt',
      },
    },
  },
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1750277934316151930',
      height: '11679959',
      in: [
        {
          address: 'thor17wlyzcfr36dt0uvflrmghpclwlvcml2zz77wym',
          coins: [
            {
              amount: '25000000000',
              asset: 'THOR.RUNE',
            },
          ],
          txID: 'DFC6E5DF9FCBB7E62E1B69FB8D40E8F803E2958064C4337FD19C1BFF48D0D0B6',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: 'eld',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '4754538867',
          memo: '=:c:maya17wlyzcfr36dt0uvflrmghpclwlvcml2zzfqzjt:22148943679683:eld:0',
          networkFees: [
            {
              amount: '2000000000',
              asset: 'MAYA.CACAO',
            },
          ],
          streamingSwapMeta: {
            count: '1',
            depositedCoin: {
              amount: '0',
              asset: '',
            },
            inCoin: {
              amount: '0',
              asset: '',
            },
            interval: '0',
            lastHeight: '0',
            outCoin: {
              amount: '0',
              asset: '',
            },
            quantity: '1',
          },
          swapSlip: '7',
          swapTarget: '22148943679683',
        },
      },
      out: [
        {
          address: 'maya17wlyzcfr36dt0uvflrmghpclwlvcml2zzfqzjt',
          coins: [
            {
              amount: '22372670383519',
              asset: 'MAYA.CACAO',
            },
          ],
          height: '11679959',
          txID: '',
        },
      ],
      pools: ['THOR.RUNE'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '116799599000000001',
    prevPageToken: '116799599000000001',
  },
}

export default { tx, actionsResponse }
