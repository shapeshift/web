import type { AssetId } from '@shapeshiftoss/caip'

import type { EncodedRelatedAssetIndex } from './types'

export const encodeRelatedAssetIndex = (
  relatedAssetIndex: Record<AssetId, AssetId[]>,
  sortedAssetIds: AssetId[],
): EncodedRelatedAssetIndex => {
  const assetIdToAssetIdx = sortedAssetIds.reduce<Record<AssetId, number>>((acc, val, idx) => {
    acc[val] = idx
    return acc
  }, {})

  const result: EncodedRelatedAssetIndex = {}

  for (const [assetId, relatedAssets] of Object.entries(relatedAssetIndex)) {
    if (!relatedAssets.length) continue
    const assetIdx = assetIdToAssetIdx[assetId]
    result[assetIdx] = relatedAssets.map(assetId => {
      return assetIdToAssetIdx[assetId]
    })
  }

  return result
}
