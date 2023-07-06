import type { CosmosSignTx } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads/build'
import { v4 as uuid } from 'uuid'
import type {
  GetTradeQuoteInput,
  GetUnsignedTxArgs,
  SwapErrorRight,
  Swapper2Api,
  TradeQuote,
  TradeQuote2,
  UnsignedTx,
} from 'lib/swapper/api'

import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import type { OsmosisSupportedChainId } from './utils/types'

const tradeQuoteMetadata: Map<string, { chainId: OsmosisSupportedChainId }> = new Map()

export const osmosisApi: Swapper2Api = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    { sellAssetUsdRate }: { sellAssetUsdRate: string },
  ): Promise<Result<TradeQuote2, SwapErrorRight>> => {
    const tradeQuoteResult = await getTradeQuote(input, { sellAssetUsdRate })

    return tradeQuoteResult.map(tradeQuote => {
      const { receiveAddress, affiliateBps } = input
      const id = uuid()
      // TODO(gomes): this will only work for the first hop, i.e IBC transfer or swap-exact-amount-in
      // this should be programmatic based on the tradeQuote.steps
      // osmosis getTradeQuote() will need to be revamped to handle this
      tradeQuoteMetadata.set(id, {
        chainId: tradeQuote.steps[0].sellAsset.chainId as OsmosisSupportedChainId,
      })
      return { id, receiveAddress, affiliateBps, ...tradeQuote }
    })
  },

  getUnsignedTx: async ({
    from,
    tradeQuote,
    stepIndex,
  }: GetUnsignedTxArgs): Promise<CosmosSignTx> => {
    const osmosisRoute = tradeQuoteMetadata.get(tradeQuote.id)
    if (!osmosisRoute) throw Error(`missing trade quote metadata for quoteId ${tradeQuote.id}`)

    const { accountNumber, sellAsset } = tradeQuote.steps[stepIndex]

    const unsignedTx = await getUnsignedTx({
      // TODO(gomes)
      osmosisStep: osmosisRoute.steps[stepIndex],
      accountNumber,
      sellAsset,
      // discriminated union between from or xpub in GetUnsignedTxArgs, but since Osmosis only deals with IBC chains, from is always going to be defined
      from: from!,
    })

    return unsignedTx
  },

  checkTradeStatus: async ({
    txHash,
  }): Promise<{ status: TxStatus; buyTxHash: string | undefined; message: string | undefined }> => {
    try {
      // thorchain swapper uses txId to get tx status (not trade ID)
      const { buyTxId: buyTxHash } = await getTradeTxs({ tradeId: txHash })
      const status = buyTxHash ? TxStatus.Confirmed : TxStatus.Pending

      return {
        buyTxHash,
        status,
        message: undefined,
      }
    } catch (e) {
      console.error(e)
      return {
        buyTxHash: undefined,
        status: TxStatus.Failed,
        message: undefined,
      }
    }
  },
}
