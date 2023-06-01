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
import {
  ZRX_SUPPORTED_CHAINIDS,
  ZRX_UNSUPPORTED_ASSETS,
} from 'lib/swapper/swappers/ZrxSwapper/utils/constants'
import { zrxBuildTrade } from 'lib/swapper/swappers/ZrxSwapper/zrxBuildTrade/zrxBuildTrade'
import { zrxExecuteTrade } from 'lib/swapper/swappers/ZrxSwapper/zrxExecuteTrade/zrxExecuteTrade'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

import { filterEvmAssetIdsBySellable } from '../utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterSameChainEvmBuyAssetsBySellAssetId } from '../utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export type ZrxSupportedChainId =
  | KnownChainIds.EthereumMainnet
  | KnownChainIds.AvalancheMainnet
  | KnownChainIds.OptimismMainnet
  | KnownChainIds.BnbSmartChainMainnet
  | KnownChainIds.PolygonMainnet

export class ZrxSwapper implements Swapper<ZrxSupportedChainId> {
  readonly name = SwapperName.Zrx

  buildTrade(input: BuildTradeInput): Promise<Result<ZrxTrade, SwapErrorRight>> {
    return zrxBuildTrade(input)
  }

  getTradeQuote(
    input: GetEvmTradeQuoteInput,
  ): Promise<Result<TradeQuote<ZrxSupportedChainId>, SwapErrorRight>> {
    return getZrxTradeQuote(input)
  }

  executeTrade(args: ZrxExecuteTradeInput): Promise<Result<TradeResult, SwapErrorRight>> {
    return zrxExecuteTrade(args)
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[] {
    const assets = selectAssets(store.getState())
    return filterSameChainEvmBuyAssetsBySellAssetId(args).filter(assetId => {
      const asset = assets[assetId]
      if (asset === undefined) return false
      const { chainId } = asset
      return (
        !ZRX_UNSUPPORTED_ASSETS.includes(assetId) &&
        ZRX_SUPPORTED_CHAINIDS.includes(chainId as ZrxSupportedChainId)
      )
    })
  }

  filterAssetIdsBySellable(assetIds: AssetId[] = []): AssetId[] {
    const assets = selectAssets(store.getState())
    return filterEvmAssetIdsBySellable(assetIds).filter(assetId => {
      const asset = assets[assetId]
      if (asset === undefined) return false
      const { chainId } = asset
      return (
        !ZRX_UNSUPPORTED_ASSETS.includes(assetId) &&
        ZRX_SUPPORTED_CHAINIDS.includes(chainId as ZrxSupportedChainId)
      )
    })
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
