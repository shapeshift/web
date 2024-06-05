import { type AssetId } from '@shapeshiftoss/caip'

const MINIMUM_UNIQUE_SUBSTRING = 2

export const getUniqueAddressSubstring = (
  destinationAssetId: AssetId,
  longTailAssetIds: AssetId[],
) => {
  for (let length = MINIMUM_UNIQUE_SUBSTRING; length <= destinationAssetId.length; length++) {
    const suffix = destinationAssetId.slice(-length)
    const matches = longTailAssetIds.filter(assetId => assetId.slice(-length) === suffix)
    if (matches.length === 1) return suffix
  }

  return destinationAssetId
}
