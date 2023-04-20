import type { Asset } from '@shapeshiftoss/asset-service'
import type {
  avalanche,
  bnbsmartchain,
  ethereum,
  EvmChainId,
  optimism,
} from '@shapeshiftoss/chain-adapters'
import {
  ApprovalNeededInput,
  ApprovalNeededOutput,
  ApproveAmountInput,
  ApproveInfiniteInput,
  BuildTradeInput,
  BuyAssetBySellIdInput,
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  SwapErrorRight,
  Swapper,
  SwapperName,
  SwapperType,
  TradeQuote,
  TradeResult,
  TradeTxs,
} from 'lib/swapper/api'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'


import { approvalNeeded } from './approvalNeeded/approvalNeeded'
import { buildTrade } from './buildTrade/buildTrade'
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
//export class OneInchSwapper {
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
  async getTradeQuote(input: GetEvmTradeQuoteInput): Promise<Result<TradeQuote<EvmChainId>, SwapErrorRight>> {
    return await getTradeQuote(this.deps, input)
  }

  async getUsdRate(input: Asset): Promise<string> {
    return await getUsdRate(this.deps, input)
  }

  async approvalNeeded(input: ApprovalNeededInput<EvmChainId>): Promise<ApprovalNeededOutput> {
    return await approvalNeeded(this.deps, input)
  }

  async buildTrade(input: BuildTradeInput): Promise<Result<OneInchTrade<EvmChainId>, SwapErrorRight>> {
    return await buildTrade(this.deps, input)
  }
}
