import { AssetId } from '@shapeshiftoss/caip'
import { Asset, SupportedChainIds } from '@shapeshiftoss/types'

import {
  ApprovalNeededOutput,
  BuyAssetBySellIdInput,
  Swapper,
  SwapperType,
  Trade,
  TradeQuote,
  TradeResult,
  TradeTxs
} from '../../api'

/**
 * Playground for testing different scenarios of multiple swappers in the manager.
 * Meant for local testing only
 */
export class TestSwapper implements Swapper {
  supportAssets: string[]

  // noop for test
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async initialize() {}

  getType() {
    return SwapperType.Test
  }

  constructor() {
    this.supportAssets = [
      'bip122:000000000019d6689c085ae165831e93/slip44:0',
      'cosmos:cosmoshub-4/slip44:118',
      'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
    ]
  }

  getUsdRate(input: Pick<Asset, 'symbol' | 'assetId'>): Promise<string> {
    console.info(input)
    throw new Error('TestSwapper: getUsdRate unimplemented')
  }

  async approvalNeeded(): Promise<ApprovalNeededOutput> {
    throw new Error('TestSwapper: approvalNeeded unimplemented')
  }

  async approveInfinite(): Promise<string> {
    throw new Error('TestSwapper: approveInfinite unimplemented')
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[] {
    const { sellAssetId } = args
    if (!this.supportAssets.includes(sellAssetId)) return []
    return this.supportAssets
  }

  filterAssetIdsBySellable(): AssetId[] {
    return this.supportAssets
  }

  async buildTrade(): Promise<Trade<SupportedChainIds>> {
    throw new Error('TestSwapper: buildTrade unimplemented')
  }

  async getTradeQuote(): Promise<TradeQuote<SupportedChainIds>> {
    throw new Error('TestSwapper: getTradeQuote unimplemented')
  }

  async executeTrade(): Promise<TradeResult> {
    throw new Error('TestSwapper: executeTrade unimplemented')
  }

  async getTradeTxs(): Promise<TradeTxs> {
    throw new Error('TestSwapper: executeTrade unimplemented')
  }
}
