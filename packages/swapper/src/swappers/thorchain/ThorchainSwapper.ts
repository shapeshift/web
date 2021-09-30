import { Asset, SwapperType } from '@shapeshiftoss/types'
import { Swapper } from '../../api'

export class ThorchainSwapper implements Swapper {
  getType() {
    return SwapperType.Thorchain
  }

  async getQuote() {
    return undefined
  }

  async buildQuoteTx() {
    return undefined
  }

  getUsdRate(input: Pick<Asset, 'symbol' | 'tokenId'>): Promise<string> {
    console.info(input)
    throw new Error('Method not implemented.')
  }

  getAvailableAssets(assets: Asset[]): Asset[] {
    console.info(assets)
    throw new Error('Method not implemented.')
  }
  canTradePair(sellAsset: Asset, buyAsset: Asset): boolean {
    console.info(sellAsset, buyAsset)
    throw new Error('Method not implemented.')
  }
}
