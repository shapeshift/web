import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'

const MINIMUM_UNIQUE_SUBSTRING = 2

// Mirrors THORNode's externalAssetMatch: a case-insensitive suffix match against the target chain's token list only
export const getUniqueAddressSubstring = (
  destinationAssetId: AssetId,
  longTailAssetIds: AssetId[],
) => {
  const { chainId, assetReference } = fromAssetId(destinationAssetId)
  const address = assetReference.toLowerCase()

  const sameChainAddresses = longTailAssetIds
    .map(assetId => fromAssetId(assetId))
    .filter(asset => asset.chainId === chainId)
    .map(asset => asset.assetReference.toLowerCase())

  if (!sameChainAddresses.includes(address)) return address

  for (let length = MINIMUM_UNIQUE_SUBSTRING; length < address.length; length++) {
    const suffix = address.slice(-length)
    const matchCount = sameChainAddresses.filter(sameChainAddress =>
      sameChainAddress.endsWith(suffix),
    ).length

    if (matchCount === 1) return suffix
  }

  return address
}
