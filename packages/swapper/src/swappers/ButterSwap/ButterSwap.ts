import type { Swapper } from '../../types'
import { BUTTER_SWAPPER_SUPPORTED_CHAIN_IDS } from './utils/constants'

export const butterSwapper: Swapper = {
  filterAssetIdsBySellable: assets => {
    return Promise.resolve(
      assets
        .filter(asset => BUTTER_SWAPPER_SUPPORTED_CHAIN_IDS.sell.includes(asset.chainId))
        .map(asset => asset.assetId),
    )
  },

  filterBuyAssetsBySellAssetId: input => {
    return Promise.resolve(
      input.assets
        .filter(asset => BUTTER_SWAPPER_SUPPORTED_CHAIN_IDS.buy.includes(asset.chainId))
        .map(asset => asset.assetId),
    )
  },
}
