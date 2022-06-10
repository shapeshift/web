import { AssetId, ChainId } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'

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
import { COWSWAP_UNSUPPORTED_ASSETS } from './utils/blacklist'
import { getUsdRate } from './utils/helpers/helpers'

export type CowSwapperDeps = {
  apiUrl: string
}

export class CowSwapper implements Swapper<ChainId> {
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

  async buildTrade(args: BuildTradeInput): Promise<Trade<ChainId>> {
    console.info(args)
    throw new Error('CowSwapper: buildTrade unimplemented')
  }

  async getTradeQuote(input: GetTradeQuoteInput): Promise<TradeQuote<ChainId>> {
    console.info(input)
    throw new Error('CowSwapper: getTradeQuote unimplemented')
  }

  async getUsdRate(input: Asset): Promise<string> {
    return getUsdRate(this.deps, input)
  }

  async executeTrade(args: ExecuteTradeInput<ChainId>): Promise<TradeResult> {
    console.info(args)
    throw new Error('CowSwapper: executeTrade unimplemented')
  }

  async approvalNeeded(args: ApprovalNeededInput<ChainId>): Promise<ApprovalNeededOutput> {
    console.info(args)
    throw new Error('CowSwapper: approvalNeeded unimplemented')
  }

  async approveInfinite(args: ApproveInfiniteInput<ChainId>): Promise<string> {
    console.info(args)
    throw new Error('CowSwapper: approveInfinite unimplemented')
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[] {
    const { assetIds = [], sellAssetId } = args
    if (
      !sellAssetId?.startsWith('eip155:1/erc20') ||
      COWSWAP_UNSUPPORTED_ASSETS.includes(sellAssetId)
    )
      return []

    return assetIds.filter(
      (id) =>
        id !== sellAssetId &&
        id.startsWith('eip155:1/erc20') &&
        !COWSWAP_UNSUPPORTED_ASSETS.includes(id)
    )
  }

  filterAssetIdsBySellable(assetIds: AssetId[]): AssetId[] {
    return assetIds.filter(
      (id) => id.startsWith('eip155:1/erc20') && !COWSWAP_UNSUPPORTED_ASSETS.includes(id)
    )
  }

  async getTradeTxs(): Promise<TradeTxs> {
    throw new Error('CowSwapper: executeTrade unimplemented')
  }
}
