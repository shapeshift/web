import { fromAssetId } from '@shapeshiftoss/caip'

import { isContractAddress } from '../utils/isContractAddress'
import type { SearchableAsset } from './types'
import { isExactMatch } from './utils'

type DeduplicatableAsset = Pick<
  SearchableAsset,
  'assetId' | 'symbol' | 'isPrimary' | 'relatedAssetKey'
>

/**
 * Deduplicates assets by relatedAssetKey (asset family).
 *
 * Priority order:
 * 1. Primary asset (always wins within family - ensures groups are shown, not single variants)
 * 2. Exact symbol match (only if no primary exists in family)
 * 3. First asset in order (fallback)
 */
export const deduplicateAssets = <T extends DeduplicatableAsset>(
  assets: T[],
  searchString?: string,
): T[] => {
  const familyToAsset = new Map<string, T>()
  const searchLower = searchString?.toLowerCase() ?? ''

  const hasExactSymbolMatch = searchLower
    ? assets.some(a => isExactMatch(searchLower, a.symbol))
    : false

  for (const asset of assets) {
    // When the search is a valid contract address matching this asset's assetReference,
    // use assetId as the family key so each chain variant is shown independently rather than
    // collapsed into its family via relatedAssetKey.
    const matchedByAddress =
      isContractAddress(searchLower) &&
      fromAssetId(asset.assetId).assetReference.toLowerCase() === searchLower
    const familyKey = matchedByAddress ? asset.assetId : asset.relatedAssetKey ?? asset.assetId
    const existing = familyToAsset.get(familyKey)

    const isExact = hasExactSymbolMatch && isExactMatch(searchLower, asset.symbol)
    const existingIsExact =
      hasExactSymbolMatch && existing && isExactMatch(searchLower, existing.symbol)

    if (!existing) {
      familyToAsset.set(familyKey, asset)
    } else if (asset.isPrimary && !existing.isPrimary) {
      familyToAsset.set(familyKey, asset)
    } else if (isExact && !existingIsExact && !existing.isPrimary) {
      familyToAsset.set(familyKey, asset)
    }
  }

  const selectedAssets = new Set(familyToAsset.values())
  return assets.filter(asset => selectedAssets.has(asset))
}
