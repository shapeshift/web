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

export class OneInchSwapper implements Swapper<OneInchSupportedChainId, true> {
  readonly name = SwapperName.OneInch
  deps: OneInchSwapperDeps

  constructor(deps: OneInchSwapperDeps) {
    this.deps = deps
  }

  getTradeQuote(
    input: GetEvmTradeQuoteInput,
  ): Promise<Result<TradeQuote<OneInchSupportedChainId, true | false>, SwapErrorRight>> {
    return getTradeQuote(this.deps, input)
  }

  buildTrade(
    input: BuildTradeInput,
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
