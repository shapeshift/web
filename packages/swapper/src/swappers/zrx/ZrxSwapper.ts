import { Asset, ChainTypes } from '@shapeshiftoss/asset-service'
import { GetQuoteInput, Quote, Swapper, SwapperType } from '../../api'
import { getZrxQuote } from './getQuote/getQuote'
export class ZrxError extends Error {
  constructor(message: string) {
    super(message)
    this.message = `ZrxError:${message}`
  }
}
export class ZrxSwapper implements Swapper {
  getType() {
    return SwapperType.Zrx
  }

  async getQuote(input: GetQuoteInput): Promise<Quote> {
    return getZrxQuote(input)
  }

  getAvailableAssets(assets: Asset[]): Asset[] {
    return assets.filter((asset) => asset.chain === ChainTypes.Ethereum)
  }

  canTradePair(sellAsset: Asset, buyAsset: Asset): boolean {
    const availableAssets = this.getAvailableAssets([sellAsset, buyAsset])
    return availableAssets.length === 2
  }
}
