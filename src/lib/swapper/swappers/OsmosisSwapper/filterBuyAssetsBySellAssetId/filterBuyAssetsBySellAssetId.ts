import type { BuyAssetBySellIdInput } from 'lib/swapper/api'

import { SUPPORTED_ASSET_IDS } from '../utils/constants'

export const filterBuyAssetsBySellAssetId = ({
  assets,
  sellAsset,
}: BuyAssetBySellIdInput): string[] => {
  if (!SUPPORTED_ASSET_IDS.includes(sellAsset.assetId)) return []

  return assets
    .filter(
      asset => SUPPORTED_ASSET_IDS.includes(asset.assetId) && asset.assetId !== sellAsset.assetId,
    )
    .map(asset => asset.assetId)
}
