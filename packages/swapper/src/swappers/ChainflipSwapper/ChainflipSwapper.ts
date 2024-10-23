import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import type { BuyAssetBySellIdInput, Swapper } from '../../types'
import { CHAINFLIP_SUPPORTED_CHAIN_IDS } from './constants'

export const chainflipSwapper: Swapper = {
  filterAssetIdsBySellable: (assets: Asset[]): Promise<AssetId[]> => {
    // TODO: Return only Chainflip supported coins
    return Promise.resolve(
      assets
        .filter(asset => CHAINFLIP_SUPPORTED_CHAIN_IDS.sell.includes(asset.chainId))
        .map(asset => asset.assetId),
    )
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    // TODO: Return only Chainflip supported coins
    return Promise.resolve(
      input.assets
        .filter(asset => CHAINFLIP_SUPPORTED_CHAIN_IDS.buy.includes(asset.chainId))
        .map(asset => asset.assetId),
    )
  },
}
