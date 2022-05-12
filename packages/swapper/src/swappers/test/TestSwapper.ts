import { AssetId } from '@shapeshiftoss/caip'
import {
  ApprovalNeededOutput,
  Asset,
  ExecQuoteOutput,
  GetMinMaxInput,
  MinMaxOutput,
  SupportedChainIds,
  SwapperType
} from '@shapeshiftoss/types'

import { BuyAssetBySellIdInput, Swapper, Trade, TradeQuote } from '../../api'

/**
 * Playground for testing different scenarios of multiple swappers in the manager.
 * Meant for local testing only
 */
export class TestSwapper implements Swapper {
  supportAssets: string[]

  getType() {
    return SwapperType.Test
  }

  constructor() {
    this.supportAssets = [
      'bip122:000000000933ea01ad0ee984209779ba/slip44:0',
      'cosmos:cosmoshub-4/slip44:118',
      'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
    ]
  }

  getUsdRate(input: Pick<Asset, 'symbol' | 'tokenId'>): Promise<string> {
    console.info(input)
    throw new Error('TestSwapper: getUsdRate unimplemented')
  }

  getMinMax(input: GetMinMaxInput): Promise<MinMaxOutput> {
    console.info(input)
    throw new Error('TestSwapper: getMinMax unimplemented')
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

  async executeTrade(): Promise<ExecQuoteOutput> {
    throw new Error('TestSwapper: executeTrade unimplemented')
  }
}
