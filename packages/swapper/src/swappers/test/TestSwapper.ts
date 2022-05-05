import { CAIP19 } from '@shapeshiftoss/caip'
import {
  ApprovalNeededOutput,
  Asset,
  ChainTypes,
  ExecQuoteOutput,
  GetQuoteInput,
  MinMaxOutput,
  Quote,
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

  async getQuote(): Promise<Quote<ChainTypes>> {
    throw new Error('TestSwapper: getQuote unimplemented')
  }

  async buildQuoteTx(): Promise<Quote<ChainTypes>> {
    throw new Error('TestSwapper: getQuote unimplemented')
  }

  getUsdRate(input: Pick<Asset, 'symbol' | 'tokenId'>): Promise<string> {
    console.info(input)
    throw new Error('TestSwapper: getUsdRate unimplemented')
  }

  getMinMax(input: GetQuoteInput): Promise<MinMaxOutput> {
    console.info(input)
    throw new Error('TestSwapper: getMinMax unimplemented')
  }

  async executeQuote(): Promise<ExecQuoteOutput> {
    throw new Error('TestSwapper: executeQuote unimplemented')
  }

  async approvalNeeded(): Promise<ApprovalNeededOutput> {
    throw new Error('TestSwapper: approvalNeeded unimplemented')
  }

  async approveInfinite(): Promise<string> {
    throw new Error('TestSwapper: approveInfinite unimplemented')
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): CAIP19[] {
    const { sellAssetId } = args
    if (!this.supportAssets.includes(sellAssetId)) return []
    return this.supportAssets
  }

  filterAssetIdsBySellable(): CAIP19[] {
    return this.supportAssets
  }

  async buildTrade(): Promise<Trade<ChainTypes>> {
    throw new Error('TestSwapper: buildTrade unimplemented')
  }

  async getTradeQuote(): Promise<TradeQuote<ChainTypes>> {
    throw new Error('TestSwapper: getTradeQuote unimplemented')
  }

  async executeTrade(): Promise<ExecQuoteOutput> {
    throw new Error('TestSwapper: executeTrade unimplemented')
  }
}
