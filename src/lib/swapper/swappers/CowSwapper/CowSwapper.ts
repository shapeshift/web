import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type { ethereum } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import type Web3 from 'web3'
import type {
  ApprovalNeededInput,
  ApprovalNeededOutput,
  ApproveAmountInput,
  ApproveInfiniteInput,
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
import { cowApprovalNeeded } from 'lib/swapper/swappers/CowSwapper/cowApprovalNeeded/cowApprovalNeeded'
import {
  cowApproveAmount,
  cowApproveInfinite,
} from 'lib/swapper/swappers/CowSwapper/cowApprove/cowApprove'
import { cowBuildTrade } from 'lib/swapper/swappers/CowSwapper/cowBuildTrade/cowBuildTrade'
import { cowExecuteTrade } from 'lib/swapper/swappers/CowSwapper/cowExecuteTrade/cowExecuteTrade'
import { cowGetTradeTxs } from 'lib/swapper/swappers/CowSwapper/cowGetTradeTxs/cowGetTradeTxs'
import { getCowSwapTradeQuote } from 'lib/swapper/swappers/CowSwapper/getCowSwapTradeQuote/getCowSwapTradeQuote'
import type { CowTrade } from 'lib/swapper/swappers/CowSwapper/types'
import { COWSWAP_UNSUPPORTED_ASSETS } from 'lib/swapper/swappers/CowSwapper/utils/blacklist'
import { getUsdRate } from 'lib/swapper/swappers/CowSwapper/utils/helpers/helpers'

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

  getUsdRate(input: Asset): Promise<string> {
    return getUsdRate(this.deps, input)
  }

  executeTrade(
    args: ExecuteTradeInput<KnownChainIds.EthereumMainnet>,
  ): Promise<Result<TradeResult, SwapErrorRight>> {
    return cowExecuteTrade(this.deps, args)
  }

  approvalNeeded(
    args: ApprovalNeededInput<KnownChainIds.EthereumMainnet>,
  ): Promise<ApprovalNeededOutput> {
    return cowApprovalNeeded(this.deps, args)
  }

  approveInfinite(args: ApproveInfiniteInput<KnownChainIds.EthereumMainnet>): Promise<string> {
    return cowApproveInfinite(this.deps, args)
  }

  approveAmount(args: ApproveAmountInput<KnownChainIds.EthereumMainnet>): Promise<string> {
    return cowApproveAmount(this.deps, args)
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[] {
    const { assetIds = [], sellAssetId } = args
    if (
      fromAssetId(sellAssetId).assetNamespace !== 'erc20' ||
      COWSWAP_UNSUPPORTED_ASSETS.includes(sellAssetId)
    )
      return []

    return assetIds.filter(
      id =>
        id !== sellAssetId &&
        fromAssetId(id).chainId === KnownChainIds.EthereumMainnet &&
        !COWSWAP_UNSUPPORTED_ASSETS.includes(id),
    )
  }

  filterAssetIdsBySellable(assetIds: AssetId[]): AssetId[] {
    return assetIds.filter(id => {
      const { chainId, assetNamespace } = fromAssetId(id)
      return (
        chainId === KnownChainIds.EthereumMainnet &&
        assetNamespace === ASSET_NAMESPACE.erc20 &&
        !COWSWAP_UNSUPPORTED_ASSETS.includes(id)
      )
    })
  }

  getTradeTxs(args: TradeResult): Promise<Result<TradeTxs, SwapErrorRight>> {
    return cowGetTradeTxs(this.deps, args)
  }
}

export * from './utils'
export * from './types'
