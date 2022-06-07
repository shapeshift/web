import { AssetId } from '@shapeshiftoss/caip'
import { Asset, SupportedChainIds } from '@shapeshiftoss/types'

import {
  ApprovalNeededInput,
  ApprovalNeededOutput,
  ApproveInfiniteInput,
  BuildTradeInput,
  BuyAssetBySellIdInput,
  ExecuteTradeInput,
  GetTradeQuoteInput,
  Swapper,
  SwapperType,
  Trade,
  TradeQuote,
  TradeResult,
  TradeTxs
} from '../../api'
import { getUsdRate } from './utils/helpers/helpers'

export type CowSwapperDeps = {
  apiUrl: string
}

export class CowSwapper implements Swapper {
  public static swapperName = 'CowSwapper'
  deps: CowSwapperDeps

  constructor(deps: CowSwapperDeps) {
    this.deps = deps
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async initialize() {}

  getType() {
    return SwapperType.CowSwap
  }

  async buildTrade(args: BuildTradeInput): Promise<Trade<SupportedChainIds>> {
    console.info(args)
    throw new Error('CowSwapper: buildTrade unimplemented')
  }

  async getTradeQuote(input: GetTradeQuoteInput): Promise<TradeQuote<SupportedChainIds>> {
    console.info(input)
    throw new Error('CowSwapper: getTradeQuote unimplemented')
  }

  async getUsdRate(input: Asset): Promise<string> {
    return getUsdRate(this.deps, input)
  }

  async executeTrade(args: ExecuteTradeInput<SupportedChainIds>): Promise<TradeResult> {
    console.info(args)
    throw new Error('CowSwapper: executeTrade unimplemented')
  }

  async approvalNeeded(
    args: ApprovalNeededInput<SupportedChainIds>
  ): Promise<ApprovalNeededOutput> {
    console.info(args)
    throw new Error('CowSwapper: approvalNeeded unimplemented')
  }

  async approveInfinite(args: ApproveInfiniteInput<SupportedChainIds>): Promise<string> {
    console.info(args)
    throw new Error('CowSwapper: approveInfinite unimplemented')
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[] {
    console.info(args)
    return []
  }

  filterAssetIdsBySellable(assetIds: AssetId[]): AssetId[] {
    console.info(assetIds)
    return []
  }

  async getTradeTxs(): Promise<TradeTxs> {
    throw new Error('CowSwapper: executeTrade unimplemented')
  }
}
