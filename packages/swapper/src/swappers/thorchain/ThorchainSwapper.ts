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

import { Swapper, Trade, TradeQuote } from '../../api'

export class ThorchainSwapper implements Swapper {
  getType() {
    return SwapperType.Thorchain
  }

  async getQuote(): Promise<Quote<ChainTypes>> {
    throw new Error('ThorchainSwapper: getQuote unimplemented')
  }

  async buildQuoteTx(): Promise<Quote<ChainTypes>> {
    throw new Error('ThorchainSwapper: getQuote unimplemented')
  }

  getUsdRate(input: Pick<Asset, 'symbol' | 'tokenId'>): Promise<string> {
    console.info(input)
    throw new Error('ThorchainSwapper: getUsdRate unimplemented')
  }

  getMinMax(input: GetQuoteInput): Promise<MinMaxOutput> {
    console.info(input)
    throw new Error('ThorchainSwapper: getMinMax unimplemented')
  }

  async executeQuote(): Promise<ExecQuoteOutput> {
    throw new Error('ThorchainSwapper: executeQuote unimplemented')
  }

  async approvalNeeded(): Promise<ApprovalNeededOutput> {
    throw new Error('ThorchainSwapper: approvalNeeded unimplemented')
  }

  async approveInfinite(): Promise<string> {
    throw new Error('ThorchainSwapper: approveInfinite unimplemented')
  }

  filterBuyAssetsBySellAssetId(): CAIP19[] {
    return []
  }

  filterAssetIdsBySellable(): CAIP19[] {
    return []
  }

  async buildTrade(): Promise<Trade<ChainTypes>> {
    throw new Error('ThorchainSwapper: buildTrade unimplemented')
  }

  async getTradeQuote(): Promise<TradeQuote<ChainTypes>> {
    throw new Error('ThorchainSwapper: getTradeQuote unimplemented')
  }

  async executeTrade(): Promise<ExecQuoteOutput> {
    throw new Error('ThorchainSwapper: executeTrade unimplemented')
  }
}
