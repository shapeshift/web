import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import type { BuyAssetBySellIdInput, Swapper } from '../../types'
import { CHAINFLIP_SUPPORTED_CHAIN_IDS } from './constants'
import { isSupportedAsset } from "./utils/helpers";

export const chainflipSwapper: Swapper = {
  filterAssetIdsBySellable: (assets: Asset[]): Promise<AssetId[]> => {
    return Promise.resolve(
      assets
        .filter(asset => CHAINFLIP_SUPPORTED_CHAIN_IDS.sell.includes(asset.chainId))
        .filter(asset => isSupportedAsset(asset.chainId, asset.symbol))
        .map(asset => asset.assetId),
    )
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(
      input.assets
        .filter(asset => CHAINFLIP_SUPPORTED_CHAIN_IDS.buy.includes(asset.chainId))
        .filter(asset => isSupportedAsset(asset.chainId, asset.symbol))
        .map(asset => asset.assetId),
    )
  },
}
