import type { AssetId } from '@shapeshiftoss/caip'
import { isNft } from '@shapeshiftoss/caip'
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
import { cowChainIds } from 'lib/swapper/swappers/CowSwapper/types'
import { COWSWAP_UNSUPPORTED_ASSETS } from 'lib/swapper/swappers/CowSwapper/utils/blacklist'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

import { isNativeEvmAsset } from '../utils/helpers/helpers'
import { filterBuyAssetsBySellAssetId } from './filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export class CowSwapper<T extends CowChainId> implements Swapper<T> {
  readonly name = SwapperName.CowSwap
  supportedChainIds: CowChainId[]

  constructor(supportedChainIds: CowChainId[]) {
    this.supportedChainIds = supportedChainIds
  }

  buildTrade(input: BuildTradeInput): Promise<Result<CowTrade<T>, SwapErrorRight>> {
    return cowBuildTrade(input, this.supportedChainIds)
  }

  getTradeQuote(
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote<CowChainId>, SwapErrorRight>> {
    return getCowSwapTradeQuote(input, this.supportedChainIds)
  }

  executeTrade(args: CowExecuteTradeInput<T>): Promise<Result<CowTradeResult, SwapErrorRight>> {
    return cowExecuteTrade<T>(args, this.supportedChainIds)
  }

  filterBuyAssetsBySellAssetId(input: BuyAssetBySellIdInput): AssetId[] {
    const assets = selectAssets(store.getState())
    return filterBuyAssetsBySellAssetId(input, assets, this.supportedChainIds)
  }

  filterAssetIdsBySellable(assetIds: AssetId[]): AssetId[] {
    const assets = selectAssets(store.getState())

    return assetIds.filter(id => {
      const asset = assets[id]
      if (!asset) return false

      return (
        cowChainIds.includes(asset.chainId as CowChainId) &&
        this.supportedChainIds.includes(asset.chainId as CowChainId) &&
        !COWSWAP_UNSUPPORTED_ASSETS.includes(id) &&
        !isNativeEvmAsset(id) &&
        !isNft(id)
      )
    })
  }

  getTradeTxs(args: CowTradeResult): Promise<Result<TradeTxs, SwapErrorRight>> {
    return cowGetTradeTxs(args)
  }
}

export * from './types'
