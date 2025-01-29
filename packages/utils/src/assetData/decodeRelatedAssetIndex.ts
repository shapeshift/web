import type { AssetId } from '@shapeshiftoss/caip'

import type { EncodedRelatedAssetIndex } from './types'

export const decodeRelatedAssetIndex = (
  encodedRelatedAssetIndex: EncodedRelatedAssetIndex,
  sortedAssetIds: AssetId[],
): Record<AssetId, AssetId[]> => {
  const result: Record<AssetId, AssetId[]> = {}

  for (let assetIdx = 0; assetIdx < sortedAssetIds.length; assetIdx++) {
    const assetId = sortedAssetIds[assetIdx]

    if (!encodedRelatedAssetIndex[assetIdx]) continue

    result[assetId] = encodedRelatedAssetIndex[assetIdx].map(
      innerAssetIdx => sortedAssetIds[innerAssetIdx],
    )
  }

  return result
}
