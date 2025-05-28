import type { Swapper } from '../../types'
import { executeEvmTransaction } from '../../utils'
import { PORTALS_SUPPORTED_CHAIN_IDS } from './constants'

export const portalsSwapper: Swapper = {
  executeEvmTransaction,
  filterAssetIdsBySellable: assets => {
    return Promise.resolve(
      assets
        .filter(asset => PORTALS_SUPPORTED_CHAIN_IDS.sell.includes(asset.chainId))
        .map(asset => asset.assetId),
    )
  },
  filterBuyAssetsBySellAssetId: input => {
    return Promise.resolve(
      input.assets
        .filter(asset => PORTALS_SUPPORTED_CHAIN_IDS.buy.includes(asset.chainId))
        .map(asset => asset.assetId),
    )
  },
}
