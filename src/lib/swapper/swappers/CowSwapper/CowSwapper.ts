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
import { isNativeEvmAsset } from '../utils/helpers/helpers'
import { isCowswapSupportedChainId } from './utils/helpers/helpers'

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


  buildTrade(input: BuildTradeInput): Promise<Result<CowTrade<T>, SwapErrorRight>> {
    return cowBuildTrade<T>(this.deps, this.network, input)
  }

  getTradeQuote(
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote<KnownChainIds.EthereumMainnet>, SwapErrorRight>> {
    console.log('getTradeQuote', input)
    return getCowSwapTradeQuote(this.deps, this.network, input)
  }

  executeTrade(args: CowswapExecuteTradeInput<T>): Promise<Result<TradeResult, SwapErrorRight>> {
    return cowExecuteTrade<T>(this.deps, this.network, args)
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
    return cowGetTradeTxs(this.deps, this.network, args)
  }
}

export * from './types'
