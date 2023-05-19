import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import type { ethereum } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import type Web3 from 'web3'
import type {
  BuildTradeInput,
  BuyAssetBySellIdInput,
  ExecuteTradeInput,
  GetTradeQuoteInput,
  SwapErrorRight,
  Swapper,
  TradeQuote,
  TradeResult,
  TradeTxs,
} from 'lib/swapper/api'
import { SwapperName, SwapperType } from 'lib/swapper/api'
import { cowBuildTrade } from 'lib/swapper/swappers/CowSwapper/cowBuildTrade/cowBuildTrade'
import { cowExecuteTrade } from 'lib/swapper/swappers/CowSwapper/cowExecuteTrade/cowExecuteTrade'
import { cowGetTradeTxs } from 'lib/swapper/swappers/CowSwapper/cowGetTradeTxs/cowGetTradeTxs'
import { getCowSwapTradeQuote } from 'lib/swapper/swappers/CowSwapper/getCowSwapTradeQuote/getCowSwapTradeQuote'
import type { CowTrade } from 'lib/swapper/swappers/CowSwapper/types'
import { COWSWAP_UNSUPPORTED_ASSETS } from 'lib/swapper/swappers/CowSwapper/utils/blacklist'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

export type CowSwapperDeps = {
  apiUrl: string
  adapter: ethereum.ChainAdapter
  web3: Web3
}

export class CowSwapper implements Swapper<KnownChainIds.EthereumMainnet> {
  readonly name = SwapperName.CowSwap
  deps: CowSwapperDeps

  constructor(deps: CowSwapperDeps) {
    this.deps = deps
  }

  getType() {
    return SwapperType.CowSwap
  }

  buildTrade(
    args: BuildTradeInput,
  ): Promise<Result<CowTrade<KnownChainIds.EthereumMainnet>, SwapErrorRight>> {
    return cowBuildTrade(this.deps, args)
  }

  getTradeQuote(
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote<KnownChainIds.EthereumMainnet>, SwapErrorRight>> {
    return getCowSwapTradeQuote(this.deps, input)
  }

  executeTrade(
    args: ExecuteTradeInput<KnownChainIds.EthereumMainnet>,
  ): Promise<Result<TradeResult, SwapErrorRight>> {
    return cowExecuteTrade(this.deps, args)
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[] {
    const { assetIds = [], sellAssetId } = args
    const assets = selectAssets(store.getState())
    const sellAsset = assets[sellAssetId]

    if (
      sellAsset === undefined ||
      sellAsset.chainId !== KnownChainIds.EthereumMainnet ||
      sellAssetId === ethAssetId || // can sell erc20 only
      COWSWAP_UNSUPPORTED_ASSETS.includes(sellAssetId)
    )
      return []

    return assetIds.filter(
      id =>
        id !== sellAssetId &&
        assets[id]?.chainId === KnownChainIds.EthereumMainnet &&
        !COWSWAP_UNSUPPORTED_ASSETS.includes(id),
    )
  }

  filterAssetIdsBySellable(assetIds: AssetId[]): AssetId[] {
    const assets = selectAssets(store.getState())

    return assetIds.filter(
      id =>
        assets[id]?.chainId === KnownChainIds.EthereumMainnet &&
        id !== ethAssetId && // can sell erc20 only
        !COWSWAP_UNSUPPORTED_ASSETS.includes(id),
    )
  }

  getTradeTxs(args: TradeResult): Promise<Result<TradeTxs, SwapErrorRight>> {
    return cowGetTradeTxs(this.deps, args)
  }
}

export * from './types'
