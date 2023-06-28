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
import { selectFeeAssetById, selectUsdRateByAssetId } from 'state/slices/selectors'
import { store } from 'state/store'

import { getThorTradeQuote } from './getThorTradeQuote/getTradeQuote'
import type { Rates, ThorUtxoSupportedChainId } from './ThorchainSwapper'
import { ThorchainSwapper } from './ThorchainSwapper'
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
  }): Promise<UnsignedTx> => {
    const { receiveAddress, affiliateBps } = tradeQuote
    const feeAsset = selectFeeAssetById(store.getState(), tradeQuote.steps[0].sellAsset.assetId)
    const buyAssetUsdRate = selectUsdRateByAssetId(
      store.getState(),
      tradeQuote.steps[0].buyAsset.assetId,
    )
    const feeAssetUsdRate = feeAsset
      ? selectUsdRateByAssetId(store.getState(), feeAsset.assetId)
      : undefined

    if (!buyAssetUsdRate) throw Error('missing buy asset usd rate')
    if (!feeAssetUsdRate) throw Error('missing fee asset usd rate')

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
    const thorchainSwapper = new ThorchainSwapper()
    // thorchain swapper uses txId to get tx status (not trade ID)
    const txsResult = await thorchainSwapper.getTradeTxs({ tradeId: txId })

    const status = (() => {
      switch (true) {
        case txsResult.isOk() && !!txsResult.unwrap().buyTxid:
          return TxStatus.Confirmed
        case txsResult.isOk() && !txsResult.unwrap().buyTxid:
          return TxStatus.Pending
        case txsResult.isErr():
          return TxStatus.Failed
        default:
          return TxStatus.Unknown
      }
    })()

    return {
      buyTxId: txsResult.isOk() ? txsResult.unwrap().buyTxid : undefined,
      status,
      message: undefined,
    }
  },
}
