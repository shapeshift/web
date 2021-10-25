import {
  Asset,
  ApprovalNeededOutput,
  SwapperType,
  Quote,
  ExecQuoteOutput,
  MinMaxOutput,
  GetQuoteInput,
  ChainTypes
} from '@shapeshiftoss/types'
import { Swapper } from '../../api'

export class ThorchainSwapper implements Swapper {
  getType() {
    return SwapperType.Thorchain
  }

  async getQuote(): Promise<Quote<ChainTypes, SwapperType>> {
    throw new Error('ThorchainSwapper: getQuote unimplemented')
  }

  async buildQuoteTx(): Promise<Quote<ChainTypes, SwapperType>> {
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

  getAvailableAssets(assets: Asset[]): Asset[] {
    console.info(assets)
    throw new Error('ThorchainSwapper: getAvailableAssets unimplemented')
  }

  canTradePair(sellAsset: Asset, buyAsset: Asset): boolean {
    console.info(sellAsset, buyAsset)
    throw new Error('ThorchainSwapper: canTradePair unimplemented')
  }

  async executeQuote(): Promise<ExecQuoteOutput> {
    throw new Error('ThorchainSwapper: executeQuote unimplemented')
  }

  getDefaultPair(): Pick<Asset, 'chain' | 'symbol' | 'name'>[] {
    throw new Error('ThorchainSwapper: getDefaultPair unimplemented')
  }

  async approvalNeeded(): Promise<ApprovalNeededOutput> {
    throw new Error('ThorchainSwapper: approvalNeeded unimplemented')
  }

  async approveInfinite(): Promise<string> {
    throw new Error('ThorchainSwapper: approveInfinite unimplemented')
  }
}
