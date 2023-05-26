import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { isNft } from '@shapeshiftoss/caip'
import type {
  avalanche,
  bnbsmartchain,
  ethereum,
  optimism,
  polygon,
} from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
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
import { SwapError, SwapErrorType, SwapperName, SwapperType } from 'lib/swapper/api'
import { getZrxTradeQuote } from 'lib/swapper/swappers/ZrxSwapper/getZrxTradeQuote/getZrxTradeQuote'
import type {
  ZrxExecuteTradeInput,
  ZrxSwapperDeps,
  ZrxTrade,
} from 'lib/swapper/swappers/ZrxSwapper/types'
import { UNSUPPORTED_ASSETS } from 'lib/swapper/swappers/ZrxSwapper/utils/blacklist'
import { zrxBuildTrade } from 'lib/swapper/swappers/ZrxSwapper/zrxBuildTrade/zrxBuildTrade'
import { zrxExecuteTrade } from 'lib/swapper/swappers/ZrxSwapper/zrxExecuteTrade/zrxExecuteTrade'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

export type ZrxSupportedChainId =
  | KnownChainIds.EthereumMainnet
  | KnownChainIds.AvalancheMainnet
  | KnownChainIds.OptimismMainnet
  | KnownChainIds.BnbSmartChainMainnet
  | KnownChainIds.PolygonMainnet

export type ZrxSupportedChainAdapter =
  | ethereum.ChainAdapter
  | avalanche.ChainAdapter
  | optimism.ChainAdapter
  | bnbsmartchain.ChainAdapter
  | polygon.ChainAdapter

export class ZrxSwapper<T extends ZrxSupportedChainId> implements Swapper<T> {
  readonly name = SwapperName.Zrx
  deps: ZrxSwapperDeps
  chainId: ChainId

  constructor(deps: ZrxSwapperDeps) {
    this.deps = deps
    this.chainId = deps.adapter.getChainId()
  }

  getType() {
    switch (this.chainId) {
      case KnownChainIds.EthereumMainnet:
        return SwapperType.ZrxEthereum
      case KnownChainIds.AvalancheMainnet:
        return SwapperType.ZrxAvalanche
      case KnownChainIds.OptimismMainnet:
        return SwapperType.ZrxOptimism
      case KnownChainIds.BnbSmartChainMainnet:
        return SwapperType.ZrxBnbSmartChain
      case KnownChainIds.PolygonMainnet:
        return SwapperType.ZrxPolygon
      default:
        throw new SwapError('[getType]', {
          code: SwapErrorType.UNSUPPORTED_CHAIN,
        })
    }
  }

  buildTrade(input: BuildTradeInput): Promise<Result<ZrxTrade<T>, SwapErrorRight>> {
    return zrxBuildTrade<T>(this.deps, input)
  }

  getTradeQuote(input: GetEvmTradeQuoteInput): Promise<Result<TradeQuote<T>, SwapErrorRight>> {
    return getZrxTradeQuote<T>(this.deps, input)
  }

  executeTrade(args: ZrxExecuteTradeInput<T>): Promise<Result<TradeResult, SwapErrorRight>> {
    return zrxExecuteTrade<T>(this.deps, args)
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[] {
    const { assetIds = [], sellAssetId } = args
    const assets = selectAssets(store.getState())
    return assetIds.filter(
      id =>
        assets[id]?.chainId === this.chainId &&
        assets[sellAssetId]?.chainId === this.chainId &&
        !isNft(id) &&
        !UNSUPPORTED_ASSETS.includes(id),
    )
  }

  filterAssetIdsBySellable(assetIds: AssetId[] = []): AssetId[] {
    const assets = selectAssets(store.getState())
    return assetIds.filter(
      id => assets[id]?.chainId === this.chainId && !isNft(id) && !UNSUPPORTED_ASSETS.includes(id),
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
