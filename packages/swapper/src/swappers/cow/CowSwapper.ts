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
  SwapErrorMonad,
  Swapper,
  TradeQuote,
  TradeResult,
  TradeTxs,
} from '../../api'
import { SwapperName, SwapperType } from '../../api'
import { cowApprovalNeeded } from './cowApprovalNeeded/cowApprovalNeeded'
import { cowApproveAmount, cowApproveInfinite } from './cowApprove/cowApprove'
import { cowBuildTrade } from './cowBuildTrade/cowBuildTrade'
import { cowExecuteTrade } from './cowExecuteTrade/cowExecuteTrade'
import { cowGetTradeTxs } from './cowGetTradeTxs/cowGetTradeTxs'
import { getCowSwapTradeQuote } from './getCowSwapTradeQuote/getCowSwapTradeQuote'
import type { CowTrade } from './types'
import { COWSWAP_UNSUPPORTED_ASSETS } from './utils/blacklist'
import { getUsdRate } from './utils/helpers/helpers'

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

  buildTrade(args: BuildTradeInput): Promise<CowTrade<KnownChainIds.EthereumMainnet>> {
    return cowBuildTrade(this.deps, args)
  }

  getTradeQuote(
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote<KnownChainIds.EthereumMainnet>, SwapErrorMonad>> {
    return getCowSwapTradeQuote(this.deps, input)
  }

  getUsdRate(input: Asset): Promise<string> {
    return getUsdRate(this.deps, input)
  }

  executeTrade(args: ExecuteTradeInput<KnownChainIds.EthereumMainnet>): Promise<TradeResult> {
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

  getTradeTxs(args: TradeResult): Promise<TradeTxs> {
    return cowGetTradeTxs(this.deps, args)
  }
}

export * from './utils'
export * from './types'
