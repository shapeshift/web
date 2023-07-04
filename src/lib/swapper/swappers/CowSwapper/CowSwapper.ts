import type { AssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import type {
  BuildTradeInput,
  BuyAssetBySellIdInput,
  GetTradeQuoteInput,
  SwapErrorRight,
  Swapper,
  TradeQuote,
  TradeTxs,
} from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import { cowBuildTrade } from 'lib/swapper/swappers/CowSwapper/cowBuildTrade/cowBuildTrade'
import { cowExecuteTrade } from 'lib/swapper/swappers/CowSwapper/cowExecuteTrade/cowExecuteTrade'
import { cowGetTradeTxs } from 'lib/swapper/swappers/CowSwapper/cowGetTradeTxs/cowGetTradeTxs'
import { getCowSwapTradeQuote } from 'lib/swapper/swappers/CowSwapper/getCowSwapTradeQuote/getCowSwapTradeQuote'
import type {
  CowChainId,
  CowExecuteTradeInput,
  CowTrade,
  CowTradeResult,
} from 'lib/swapper/swappers/CowSwapper/types'
import {
  selectBuyAssetUsdRate,
  selectSellAssetUsdRate,
} from 'state/zustand/swapperStore/amountSelectors'
import { swapperStore } from 'state/zustand/swapperStore/useSwapperStore'

import { filterAssetIdsBySellable } from './filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterBuyAssetsBySellAssetId } from './filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export class CowSwapper<T extends CowChainId> implements Swapper<T> {
  readonly name = SwapperName.CowSwap

  buildTrade(input: BuildTradeInput): Promise<Result<CowTrade<T>, SwapErrorRight>> {
    const sellAssetUsdRate = selectSellAssetUsdRate(swapperStore.getState())
    const buyAssetUsdRate = selectBuyAssetUsdRate(swapperStore.getState())
    return cowBuildTrade(input, { sellAssetUsdRate, buyAssetUsdRate })
  }

  getTradeQuote(
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote<CowChainId>, SwapErrorRight>> {
    const sellAssetUsdRate = selectSellAssetUsdRate(swapperStore.getState())
    const buyAssetUsdRate = selectBuyAssetUsdRate(swapperStore.getState())
    return getCowSwapTradeQuote(input, { sellAssetUsdRate, buyAssetUsdRate })
  }

  executeTrade(args: CowExecuteTradeInput<T>): Promise<Result<CowTradeResult, SwapErrorRight>> {
    return cowExecuteTrade<T>(args)
  }

  filterBuyAssetsBySellAssetId(input: BuyAssetBySellIdInput): AssetId[] {
    return filterBuyAssetsBySellAssetId(input)
  }

  filterAssetIdsBySellable(assetIds: AssetId[]): AssetId[] {
    return filterAssetIdsBySellable(assetIds)
  }

  getTradeTxs(args: CowTradeResult): Promise<Result<TradeTxs, SwapErrorRight>> {
    return cowGetTradeTxs(args)
  }
}

export * from './types'
