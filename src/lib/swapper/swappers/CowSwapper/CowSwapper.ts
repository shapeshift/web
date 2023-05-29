import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ethAssetId, isNft } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
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
import { SwapError, SwapErrorType, SwapperName, SwapperType } from 'lib/swapper/api'
import { cowBuildTrade } from 'lib/swapper/swappers/CowSwapper/cowBuildTrade/cowBuildTrade'
import { cowExecuteTrade } from 'lib/swapper/swappers/CowSwapper/cowExecuteTrade/cowExecuteTrade'
import { cowGetTradeTxs } from 'lib/swapper/swappers/CowSwapper/cowGetTradeTxs/cowGetTradeTxs'
import { getCowSwapTradeQuote } from 'lib/swapper/swappers/CowSwapper/getCowSwapTradeQuote/getCowSwapTradeQuote'
import type {
  CowswapExecuteTradeInput,
  CowswapSupportedChainAdapter,
  CowswapSupportedChainId,
  CowTrade,
} from 'lib/swapper/swappers/CowSwapper/types'
import { COWSWAP_UNSUPPORTED_ASSETS } from 'lib/swapper/swappers/CowSwapper/utils/blacklist'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

export type CowSwapperDeps = {
  apiUrl: string
  adapter: CowswapSupportedChainAdapter
  web3: Web3
}

export class CowSwapper<T extends CowswapSupportedChainId> implements Swapper<T> {
  readonly name = SwapperName.CowSwap
  deps: CowSwapperDeps
  chainId: ChainId
  network: string

  constructor(deps: CowSwapperDeps) {
    this.deps = deps
    this.chainId = deps.adapter.getChainId()
    this.network = this.getNetwork()
  }

  getNetwork() {
    switch(this.chainId){
      case KnownChainIds.EthereumMainnet:
        return 'mainnet'
      case KnownChainIds.GnosisMainnet:
        return 'xdai'
      default:
        return 'mainnet'
    }
  }

  getType() {
    switch (this.chainId) {
      case KnownChainIds.EthereumMainnet:
        return SwapperType.CowSwapEth
      case KnownChainIds.GnosisMainnet:
        return SwapperType.CowSwapGnosis
      default:
        throw new SwapError('[getType]', {
          code: SwapErrorType.UNSUPPORTED_CHAIN,
        })
    }
  }

  isCowswapSupportedChainId(chainId: string | undefined): chainId is CowswapSupportedChainId {
    return (
      chainId === KnownChainIds.EthereumMainnet ||
      chainId === KnownChainIds.AvalancheMainnet ||
      chainId === KnownChainIds.OptimismMainnet ||
      chainId === KnownChainIds.BnbSmartChainMainnet ||
      chainId === KnownChainIds.PolygonMainnet ||
      chainId === KnownChainIds.GnosisMainnet
    );
  }

  buildTrade(input: BuildTradeInput): Promise<Result<CowTrade<T>, SwapErrorRight>> {
    return cowBuildTrade<T>(this.deps, network, input)
  }

  getTradeQuote(
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote<KnownChainIds.EthereumMainnet>, SwapErrorRight>> {
    return getCowSwapTradeQuote(this.deps, network, input)
  }

  executeTrade(args: CowswapExecuteTradeInput<T>): Promise<Result<TradeResult, SwapErrorRight>> {
    return cowExecuteTrade<T>(this.deps, network, args)
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[] {
    const { assetIds = [], sellAssetId } = args
    const assets = selectAssets(store.getState())
    const sellAsset = assets[sellAssetId]

    if (sellAsset === undefined || COWSWAP_UNSUPPORTED_ASSETS.includes(sellAssetId)) return []

    return assetIds.filter(
      id =>
        id !== sellAssetId &&
        this.isCowswapSupportedChainId(assets[id]?.chainId) && 
        !isNft(id) &&
        !COWSWAP_UNSUPPORTED_ASSETS.includes(id),
    )
  }

  filterAssetIdsBySellable(assetIds: AssetId[] = []): AssetId[] {
    const assets = selectAssets(store.getState())
    return assetIds.filter(
      id =>
        this.isCowswapSupportedChainId(assets[id]?.chainId) && 
        id !== ethAssetId && // can sell erc20 only
        !isNft(id) &&
        !COWSWAP_UNSUPPORTED_ASSETS.includes(id),
    )
  }

  getTradeTxs(args: TradeResult): Promise<Result<TradeTxs, SwapErrorRight>> {
    return cowGetTradeTxs(this.deps, network, args)
  }
}

export * from './types'
