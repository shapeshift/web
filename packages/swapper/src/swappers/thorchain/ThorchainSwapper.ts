import { Asset } from '@shapeshiftoss/asset-service'
import { Swapper, SwapperType } from '../../api'

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

  getAvailableAssets(assets: Asset[]): Asset[] {
    console.info(assets)
    throw new Error('Method not implemented.')
  }
  canTradePair(sellAsset: Asset, buyAsset: Asset): boolean {
    console.info(sellAsset, buyAsset)
    throw new Error('Method not implemented.')
  }
}
