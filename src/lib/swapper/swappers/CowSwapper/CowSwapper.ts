import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { isNft } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import type Web3 from 'web3'
import type {
  BuildTradeInput,
  BuyAssetBySellIdInput,
  GetTradeQuoteInput,
  SwapErrorRight,
  Swapper,
  TradeQuote,
  TradeResult,
  TradeTxs,
} from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import { cowBuildTrade } from 'lib/swapper/swappers/CowSwapper/cowBuildTrade/cowBuildTrade'
import { cowExecuteTrade } from 'lib/swapper/swappers/CowSwapper/cowExecuteTrade/cowExecuteTrade'
import { cowGetTradeTxs } from 'lib/swapper/swappers/CowSwapper/cowGetTradeTxs/cowGetTradeTxs'
import { getCowSwapTradeQuote } from 'lib/swapper/swappers/CowSwapper/getCowSwapTradeQuote/getCowSwapTradeQuote'
import type {
  CowChainId,
  CowswapExecuteTradeInput,
  CowswapSupportedChainAdapter,
  CowTrade,
} from 'lib/swapper/swappers/CowSwapper/types'
import { COWSWAP_UNSUPPORTED_ASSETS } from 'lib/swapper/swappers/CowSwapper/utils/blacklist'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

import { isNativeEvmAsset } from '../utils/helpers/helpers'
import { isCowswapSupportedChainId } from './utils/utils'

export type CowSwapperDeps = {
  baseUrl: string
  adapter: CowswapSupportedChainAdapter
  web3: Web3
}

export class CowSwapper<T extends CowChainId> implements Swapper<T> {
  readonly name = SwapperName.CowSwap
  deps: CowSwapperDeps
  chainId: ChainId

  constructor(deps: CowSwapperDeps) {
    this.deps = deps
    this.chainId = deps.adapter.getChainId()
  }

  buildTrade(
    args: BuildTradeInput,
  ): Promise<Result<CowTrade<T>, SwapErrorRight>> {
    return cowBuildTrade(this.deps, args)
  }

  getTradeQuote(
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote<CowChainId>, SwapErrorRight>> {
    return getCowSwapTradeQuote(this.deps, input)
  }

  executeTrade(args: CowswapExecuteTradeInput<T>): Promise<Result<TradeResult, SwapErrorRight>> {
    return cowExecuteTrade<T>(this.deps, args)
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[] {
    const { assetIds = [], sellAssetId } = args
    const assets = selectAssets(store.getState())
    const sellAsset = assets[sellAssetId]

    if (sellAsset === undefined || COWSWAP_UNSUPPORTED_ASSETS.includes(sellAssetId)) return []

    return assetIds.filter(
      id =>
        id !== sellAssetId &&
        sellAsset.chainId === assets[id]?.chainId &&
        isCowswapSupportedChainId(assets[id]?.chainId) &&
        !isNft(id) &&
        !COWSWAP_UNSUPPORTED_ASSETS.includes(id),
    )
  }

  filterAssetIdsBySellable(assetIds: AssetId[] = []): AssetId[] {
    const assets = selectAssets(store.getState())
    return assetIds.filter(
      id =>
        isCowswapSupportedChainId(assets[id]?.chainId) &&
        !isNativeEvmAsset(id) &&
        !isNft(id) &&
        !COWSWAP_UNSUPPORTED_ASSETS.includes(id),
    )
  }

  getTradeTxs(args: TradeResult): Promise<Result<TradeTxs, SwapErrorRight>> {
    return cowGetTradeTxs(this.deps, args)
  }
}

export * from './types'
