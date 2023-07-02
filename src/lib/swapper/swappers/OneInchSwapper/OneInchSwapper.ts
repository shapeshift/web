import type { AssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Ok } from '@sniptt/monads'
import type {
  BuildTradeInput,
  BuyAssetBySellIdInput,
  GetEvmTradeQuoteInput,
  SwapErrorRight,
  Swapper,
  TradeQuote,
  TradeResult,
  TradeTxs,
} from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import { filterEvmAssetIdsBySellable } from 'lib/swapper/swappers/utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { selectSellAssetUsdRate } from 'state/zustand/swapperStore/amountSelectors'
import { swapperStore } from 'state/zustand/swapperStore/useSwapperStore'

import { buildTrade } from './buildTrade/buildTrade'
import { executeTrade } from './executeTrade/executeTrade'
import { filterBuyAssetsBySellAssetId } from './filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import type {
  OneInchExecuteTradeInput,
  OneInchSupportedChainId,
  OneInchSwapperDeps,
  OneInchTrade,
} from './utils/types'

export class OneInchSwapper implements Swapper<OneInchSupportedChainId> {
  readonly name = SwapperName.OneInch
  deps: OneInchSwapperDeps

  constructor(deps: OneInchSwapperDeps) {
    this.deps = deps
  }

  getTradeQuote(
    input: GetEvmTradeQuoteInput,
  ): Promise<Result<TradeQuote<OneInchSupportedChainId>, SwapErrorRight>> {
    const sellAssetUsdRate = selectSellAssetUsdRate(swapperStore.getState())
    return getTradeQuote(input, sellAssetUsdRate)
  }

  buildTrade(
    input: BuildTradeInput & GetEvmTradeQuoteInput,
  ): Promise<Result<OneInchTrade<OneInchSupportedChainId>, SwapErrorRight>> {
    return buildTrade(this.deps, input)
  }

  executeTrade(
    input: OneInchExecuteTradeInput<OneInchSupportedChainId>,
  ): Promise<Result<TradeResult, SwapErrorRight>> {
    return executeTrade(input)
  }

  filterAssetIdsBySellable(assetIds: AssetId[]): AssetId[] {
    return filterEvmAssetIdsBySellable(assetIds)
  }

  filterBuyAssetsBySellAssetId(input: BuyAssetBySellIdInput): AssetId[] {
    return filterBuyAssetsBySellAssetId(input)
  }

  getTradeTxs(tradeResult: TradeResult): Promise<Result<TradeTxs, SwapErrorRight>> {
    return Promise.resolve(
      Ok({
        sellTxid: tradeResult.tradeId,
        buyTxid: tradeResult.tradeId,
      }),
    )
  }
}
