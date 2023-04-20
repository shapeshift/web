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
import { Ok } from '@sniptt/monads'
import type {
  ApprovalNeededInput,
  ApprovalNeededOutput,
  ApproveAmountInput,
  ApproveInfiniteInput,
  BuildTradeInput,
  BuyAssetBySellIdInput,
  GetEvmTradeQuoteInput,
  SwapErrorRight,
  Swapper,
  TradeQuote,
  TradeResult,
  TradeTxs,
} from 'lib/swapper/api'
import { SwapperName, SwapperType } from 'lib/swapper/api'

import { approveAmount, approveInfinite } from '../LifiSwapper/approve/approve'
import { filterAssetIdsBySellable } from '../LifiSwapper/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { approvalNeeded } from './approvalNeeded/approvalNeeded'
import { buildTrade } from './buildTrade/buildTrade'
import { executeTrade } from './executeTrade/executeTrade'
import { filterBuyAssetsBySellAssetId } from './filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getUsdRate } from './getUsdRate/getUsdRate'
import type { OneInchExecuteTradeInput, OneInchSwapperDeps, OneInchTrade } from './utils/types'

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
  getTradeQuote(
    input: GetEvmTradeQuoteInput,
  ): Promise<Result<TradeQuote<EvmChainId>, SwapErrorRight>> {
    return getTradeQuote(this.deps, input)
  }

  getUsdRate(input: Asset): Promise<string> {
    return getUsdRate(this.deps, input)
  }

  approvalNeeded(input: ApprovalNeededInput<EvmChainId>): Promise<ApprovalNeededOutput> {
    return approvalNeeded(this.deps, input)
  }

  buildTrade(input: BuildTradeInput): Promise<Result<OneInchTrade<EvmChainId>, SwapErrorRight>> {
    return buildTrade(this.deps, input)
  }

  approveAmount(input: ApproveAmountInput<EvmChainId>): Promise<string> {
    return approveAmount(input) // NOTE: should we abstract the lifi implementation into a base class, it should work the same for all EVM based swappers
  }

  approveInfinite(input: ApproveInfiniteInput<EvmChainId>): Promise<string> {
    return approveInfinite(input)
  }

  executeTrade(
    input: OneInchExecuteTradeInput<EvmChainId>,
  ): Promise<Result<TradeResult, SwapErrorRight>> {
    return executeTrade(this.deps, input)
  }

  filterAssetIdsBySellable(assetIds: AssetId[]): AssetId[] {
    return filterAssetIdsBySellable(assetIds) // we can use lifis implementation for this also
  }

  filterBuyAssetsBySellAssetId(input: BuyAssetBySellIdInput): AssetId[] {
    return filterBuyAssetsBySellAssetId(input)
  }

  getTradeTxs(tradeResult: TradeResult): Promise<Result<TradeTxs, SwapErrorRight>> {
    return Promise.resolve(
      Ok({
        sellTxid: tradeResult.tradeId,
        buyTxid: tradeResult.tradeId,
      }),
    )
  }
}
