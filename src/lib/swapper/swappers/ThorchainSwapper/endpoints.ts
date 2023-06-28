import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads/build'
import { v4 as uuid } from 'uuid'
import type {
  GetTradeQuoteInput,
  SwapErrorRight,
  Swapper2Api,
  TradeQuote,
  TradeQuote2,
  UnsignedTx,
} from 'lib/swapper/api'

import { getThorTradeQuote } from './getThorTradeQuote/getTradeQuote'
import { getTradeTxs } from './getTradeTxs/getTradeTxs'
import type { Rates, ThorUtxoSupportedChainId } from './ThorchainSwapper'
import { getSignTxFromQuote } from './utils/getSignTxFromQuote'

export const thorchainApi: Swapper2Api = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    rates: Rates,
  ): Promise<Result<TradeQuote2, SwapErrorRight>> => {
    const tradeQuoteResult = await getThorTradeQuote(input, rates)

    return tradeQuoteResult.map(tradeQuote => {
      const { receiveAddress, affiliateBps } = input
      const id = uuid()

      return { id, receiveAddress, affiliateBps, ...tradeQuote }
    })
  },

  getUnsignedTx: async ({
    accountMetadata,
    tradeQuote,
    from,
    xpub,
    supportsEIP1559,
    buyAssetUsdRate,
    feeAssetUsdRate,
  }): Promise<UnsignedTx> => {
    const { receiveAddress, affiliateBps } = tradeQuote

    const accountType = accountMetadata?.accountType

    const chainSpecific =
      accountType && xpub
        ? {
            xpub,
            accountType,
            satoshiPerByte: (tradeQuote as TradeQuote<ThorUtxoSupportedChainId>).steps[0].feeData
              .chainSpecific.satsPerByte,
          }
        : undefined

    const fromOrXpub = from !== undefined ? { from } : { xpub }
    return await getSignTxFromQuote({
      tradeQuote,
      receiveAddress,
      affiliateBps,
      chainSpecific,
      buyAssetUsdRate,
      ...fromOrXpub,
      feeAssetUsdRate,
      supportsEIP1559,
    })
  },

  checkTradeStatus: async ({
    txId,
  }): Promise<{ status: TxStatus; buyTxId: string | undefined; message: string | undefined }> => {
    try {
      // thorchain swapper uses txId to get tx status (not trade ID)
      const { buyTxId } = await getTradeTxs({ tradeId: txId })
      const status = buyTxId ? TxStatus.Confirmed : TxStatus.Pending

      return {
        buyTxId,
        status,
        message: undefined,
      }
    } catch (e) {
      console.error(e)
      return {
        buyTxId: undefined,
        status: TxStatus.Failed,
        message: undefined,
      }
    }
  },
}
