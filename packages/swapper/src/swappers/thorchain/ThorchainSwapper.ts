import {
  Asset,
  SwapperType,
  Quote,
  ExecQuoteOutput,
  MinMaxOutput,
  GetQuoteInput
} from '@shapeshiftoss/types'
import { Swapper } from '../../api'

export class ThorchainSwapper implements Swapper {
  getType() {
    return SwapperType.Thorchain
  }

  async getQuote(): Promise<Quote> {
    throw new Error('ThorchainSwapper: getQuote unimplemented')
  }

  async buildQuoteTx(): Promise<Quote> {
    throw new Error('ThorchainSwapper: getQuote unimplemented')
  }

  getUsdRate(input: Pick<Asset, 'symbol' | 'tokenId'>): Promise<string> {
    console.info(input)
    throw new Error('ThorchainSwapper: getUsdRate unimplemented')
  }

  getMinMax(input: GetQuoteInput): Promise<MinMaxOutput> {
    console.info(input)
    throw new Error('Method not implemented.')
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

  getDefaultPair(): Partial<Asset>[] {
    throw new Error('Method not implemented.')
  }
}
