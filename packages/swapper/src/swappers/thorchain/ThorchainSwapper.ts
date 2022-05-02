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

import { Swapper } from '../../api'

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
}
