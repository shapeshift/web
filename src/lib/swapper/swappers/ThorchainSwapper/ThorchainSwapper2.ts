import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import type { BuyAssetBySellIdInput, ExecuteTradeInput2, Swapper2 } from 'lib/swapper/api'
import { selectFeeAssetById, selectUsdRateByAssetId } from 'state/slices/selectors'
import { store } from 'state/store'

import { buildTradeFromQuote } from './buildThorTrade/buildThorTrade'
import { getThorTradeQuote } from './getThorTradeQuote/getTradeQuote'
import { getTradeTxs } from './getTradeTxs/getTradeTxs'
import { ThorchainSwapper } from './ThorchainSwapper'

export const thorchain: Swapper2 = {
  getTradeQuote: getThorTradeQuote,

  executeTrade: async ({
    tradeQuote,
    wallet,
    affiliateBps,
    receiveAddress,
    xpub,
    accountType,
  }: ExecuteTradeInput2): Promise<string> => {
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

    const trade = await buildTradeFromQuote({
      tradeQuote,
      wallet,
      receiveAddress,
      affiliateBps,
      xpub,
      accountType,
      buyAssetUsdRate,
      feeAssetUsdRate,
    })

    if (trade.isErr()) throw trade.unwrapErr()

    const thorchainSwapper = new ThorchainSwapper()
    const executeTradeResult = await thorchainSwapper.executeTrade({
      trade: trade.unwrap(),
      wallet,
    })
    if (executeTradeResult.isErr()) throw executeTradeResult.unwrapErr()

    return executeTradeResult.unwrap().tradeId
  },

  checkTradeStatus: async (txId: string): Promise<{ isComplete: boolean; message?: string }> => {
    const txsResult = await getTradeTxs(txId)
    return {
      isComplete: txsResult.isOk() && !!txsResult.unwrap().buyTxid,
    }
  },

  filterAssetIdsBySellable: (): AssetId[] => {
    return [thorchainAssetId]
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): AssetId[] => {
    const thorchainSwapper = new ThorchainSwapper()
    return thorchainSwapper.filterBuyAssetsBySellAssetId(input)
  },
}
