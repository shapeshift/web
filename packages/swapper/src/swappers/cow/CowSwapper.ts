import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type { ethereum } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
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

  async buildTrade(args: BuildTradeInput): Promise<CowTrade<KnownChainIds.EthereumMainnet>> {
    return await cowBuildTrade(this.deps, args)
  }

  async getTradeQuote(
    input: GetTradeQuoteInput,
  ): Promise<TradeQuote<KnownChainIds.EthereumMainnet>> {
    return await getCowSwapTradeQuote(this.deps, input)
  }

  async getUsdRate(input: Asset): Promise<string> {
    return await getUsdRate(this.deps, input)
  }

  async executeTrade(args: ExecuteTradeInput<KnownChainIds.EthereumMainnet>): Promise<TradeResult> {
    return await cowExecuteTrade(this.deps, args)
  }

  async approvalNeeded(
    args: ApprovalNeededInput<KnownChainIds.EthereumMainnet>,
  ): Promise<ApprovalNeededOutput> {
    return await cowApprovalNeeded(this.deps, args)
  }

  async approveInfinite(
    args: ApproveInfiniteInput<KnownChainIds.EthereumMainnet>,
  ): Promise<string> {
    return await cowApproveInfinite(this.deps, args)
  }

  async approveAmount(args: ApproveAmountInput<KnownChainIds.EthereumMainnet>): Promise<string> {
    return await cowApproveAmount(this.deps, args)
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

  async getTradeTxs(args: TradeResult): Promise<TradeTxs> {
    return await cowGetTradeTxs(this.deps, args)
  }
}

export * from './utils'
export * from './types'
