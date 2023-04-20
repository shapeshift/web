import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import type {
  avalanche,
  bnbsmartchain,
  ethereum,
  EvmChainId,
  optimism,
} from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import type {
  ApprovalNeededInput,
  ApprovalNeededOutput,
  ApproveAmountInput,
  ApproveInfiniteInput,
  BuildTradeInput,
  BuyAssetBySellIdInput,
  ExecuteTradeInput,
  GetEvmTradeQuoteInput,
  SwapErrorRight,
  Swapper,
  TradeQuote,
  TradeResult,
  TradeTxs,
} from 'lib/swapper/api'
import { GetTradeQuoteInput, SwapperName, SwapperType } from 'lib/swapper/api'

import { approveAmount, approveInfinite } from '../LifiSwapper/approve/approve'
import { filterAssetIdsBySellable } from '../LifiSwapper/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { approvalNeeded } from './approvalNeeded/approvalNeeded'
import { buildTrade } from './buildTrade/buildTrade'
import { filterBuyAssetsBySellAssetId } from './filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getUsdRate } from './getUsdRate/getUsdRate'
import type { OneInchSwapperDeps, OneInchTrade } from './utils/types'

export type OneInchSupportedChainId =
  | KnownChainIds.EthereumMainnet
  | KnownChainIds.BnbSmartChainMainnet
  | KnownChainIds.OptimismMainnet
  | KnownChainIds.AvalancheMainnet

export type OneInchSupportedChainAdapter =
  | ethereum.ChainAdapter
  | bnbsmartchain.ChainAdapter
  | optimism.ChainAdapter
  | avalanche.ChainAdapter

export class OneInchSwapper implements Swapper<EvmChainId> {
  readonly name = SwapperName.OneInch
  deps: OneInchSwapperDeps

  constructor(deps: OneInchSwapperDeps) {
    this.deps = deps
  }

  /** Returns the swapper type */
  getType(): SwapperType {
    return SwapperType.OneInch
  }

  /**
   * Get a trade quote
   */
  async getTradeQuote(
    input: GetEvmTradeQuoteInput,
  ): Promise<Result<TradeQuote<EvmChainId>, SwapErrorRight>> {
    return await getTradeQuote(this.deps, input)
  }

  async getUsdRate(input: Asset): Promise<string> {
    return await getUsdRate(this.deps, input)
  }

  async approvalNeeded(input: ApprovalNeededInput<EvmChainId>): Promise<ApprovalNeededOutput> {
    return await approvalNeeded(this.deps, input)
  }

  async buildTrade(
    input: BuildTradeInput,
  ): Promise<Result<OneInchTrade<EvmChainId>, SwapErrorRight>> {
    return await buildTrade(this.deps, input)
  }

  approveAmount(input: ApproveAmountInput<EvmChainId>): Promise<string> {
    return approveAmount(input) // NOTE: should we abstract the lifi implementation into a base class, it should work the same for all EVM based swappers
  }

  approveInfinite(input: ApproveInfiniteInput<EvmChainId>): Promise<string> {
    return approveInfinite(input)
  }

  executeTrade(input: ExecuteTradeInput<EvmChainId>): Promise<Result<TradeResult, SwapErrorRight>> {
    throw new Error('Method not implemented.')
  }

  filterAssetIdsBySellable(assetIds: AssetId[]): AssetId[] {
    return filterAssetIdsBySellable(assetIds) // we can use lifis implementation for this also
  }

  filterBuyAssetsBySellAssetId(input: BuyAssetBySellIdInput): AssetId[] {
    return filterBuyAssetsBySellAssetId(input)
  }

  getTradeTxs(input: TradeResult): Promise<Result<TradeTxs, SwapErrorRight>> {
    throw new Error('Method not implemented.')
  }
}
