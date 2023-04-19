import type {
  avalanche,
  bnbsmartchain,
  ethereum,
  EvmChainId,
  optimism,
} from '@shapeshiftoss/chain-adapters'
import type {
  ApprovalNeededInput,
  ApprovalNeededOutput,
  ApproveAmountInput,
  ApproveInfiniteInput,
  BuildTradeInput,
  BuyAssetBySellIdInput,
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  Swapper,
  TradeQuote,
  TradeResult,
  TradeTxs,
} from '@shapeshiftoss/swapper'
import { SwapperName, SwapperType, Trade } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'

import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getUsdRate } from './getUsdRate/getUsdRate'
import type { OneInchSwapperDeps } from './utils/types'

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

  /** perform any necessary async initialization */
  async initialize(): Promise<void> {
    // no-op
  }

  /** Returns the swapper type */
  getType(): SwapperType {
    return SwapperType.OneInch
  }

  /**
   * Get a trade quote
   */
  async getTradeQuote(input: GetEvmTradeQuoteInput): Promise<TradeQuote<EvmChainId>> {
    return await getTradeQuote(this.deps, input)
  }

  async getUsdRate(input: GetTradeQuoteInput): Promise<string> {
    return await getUsdRate(this.deps, input)
  }

  async approvalNeeded(args: ApprovalNeededInput<T>): Promise<ApprovalNeededOutput> {
    return { approvalNeeded: false }
  }
}
