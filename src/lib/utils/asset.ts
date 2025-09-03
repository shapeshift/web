import type { AssetId } from '@shapeshiftoss/caip'

export const isPrimaryAsset = (relatedAssetKey: AssetId | null | undefined, assetId: AssetId) => {
  return relatedAssetKey === null || relatedAssetKey === assetId
}
