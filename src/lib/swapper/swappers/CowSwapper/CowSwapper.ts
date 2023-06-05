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
  CowswapExecuteTradeInput,
  CowTrade,
  CowTradeResult,
} from 'lib/swapper/swappers/CowSwapper/types'
import { COWSWAP_UNSUPPORTED_ASSETS } from 'lib/swapper/swappers/CowSwapper/utils/blacklist'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

import { isNativeEvmAsset } from '../utils/helpers/helpers'
import { isCowswapSupportedChainId } from './utils/utils'
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

  executeTrade(args: CowswapExecuteTradeInput<T>): Promise<Result<CowTradeResult, SwapErrorRight>> {
    return cowExecuteTrade<T>(args, this.supportedChainIds)
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[] {
    const { assetIds = [], sellAssetId } = args
    const assets = selectAssets(store.getState())
    const sellAsset = assets[sellAssetId]

    if (
      sellAsset === undefined ||
      isNativeEvmAsset(sellAssetId) ||
      !isCowswapSupportedChainId(sellAsset.chainId, this.supportedChainIds) ||
      COWSWAP_UNSUPPORTED_ASSETS.includes(sellAssetId)
    )
      return []

    return assetIds.filter(id => {
      const asset = assets[id]
      if (!asset) return false

      return (
        id !== sellAssetId &&
        sellAsset.chainId === assets[id]?.chainId &&
        isCowswapSupportedChainId(asset.chainId, this.supportedChainIds) &&
        !isNft(id) &&
        !COWSWAP_UNSUPPORTED_ASSETS.includes(id)
      )
    })
  }

  filterAssetIdsBySellable(assetIds: AssetId[]): AssetId[] {
    const assets = selectAssets(store.getState())
    return assetIds.filter(id => {
      const asset = assets[id]
      if (!asset) {
        return false
      }

      return (
        isCowswapSupportedChainId(asset.chainId, this.supportedChainIds) &&
        !isNativeEvmAsset(id) &&
        !isNft(id) &&
        !COWSWAP_UNSUPPORTED_ASSETS.includes(id)
      )
    })
  }

  getTradeTxs(args: CowTradeResult): Promise<Result<TradeTxs, SwapErrorRight>> {
    return cowGetTradeTxs(args)
  }
}

export * from './types'
