import type { AssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
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
import { getZrxTradeQuote } from 'lib/swapper/swappers/ZrxSwapper/getZrxTradeQuote/getZrxTradeQuote'
import type { ZrxExecuteTradeInput, ZrxTrade } from 'lib/swapper/swappers/ZrxSwapper/types'
import { UNSUPPORTED_ASSETS } from 'lib/swapper/swappers/ZrxSwapper/utils/blacklist'
import { zrxBuildTrade } from 'lib/swapper/swappers/ZrxSwapper/zrxBuildTrade/zrxBuildTrade'
import { zrxExecuteTrade } from 'lib/swapper/swappers/ZrxSwapper/zrxExecuteTrade/zrxExecuteTrade'

import { filterEvmAssetIdsBySellable } from '../utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterSameChainEvmBuyAssetsBySellAssetId } from '../utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export type ZrxSupportedChainId =
  | KnownChainIds.EthereumMainnet
  | KnownChainIds.AvalancheMainnet
  | KnownChainIds.OptimismMainnet
  | KnownChainIds.BnbSmartChainMainnet
  | KnownChainIds.PolygonMainnet

export class ZrxSwapper<T extends ZrxSupportedChainId> implements Swapper<T> {
  readonly name = SwapperName.Zrx

  buildTrade(input: BuildTradeInput): Promise<Result<ZrxTrade<T>, SwapErrorRight>> {
    return zrxBuildTrade<T>(input)
  }

  getTradeQuote(input: GetEvmTradeQuoteInput): Promise<Result<TradeQuote<T>, SwapErrorRight>> {
    return getZrxTradeQuote<T>(input)
  }

  executeTrade(args: ZrxExecuteTradeInput<T>): Promise<Result<TradeResult, SwapErrorRight>> {
    return zrxExecuteTrade<T>(args)
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[] {
    return filterSameChainEvmBuyAssetsBySellAssetId(args).filter(
      assetId => !UNSUPPORTED_ASSETS.includes(assetId),
    )
  }

  filterAssetIdsBySellable(assetIds: AssetId[] = []): AssetId[] {
    return filterEvmAssetIdsBySellable(assetIds).filter(
      assetId => !UNSUPPORTED_ASSETS.includes(assetId),
    )
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
