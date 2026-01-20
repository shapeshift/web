import type { AssetId } from '@shapeshiftoss/caip'

import { isExactMatch } from './utils'

type DeduplicatableAsset = {
  assetId: AssetId
  symbol: string
  isPrimary?: boolean
  relatedAssetKey?: AssetId | null
}

/**
 * Deduplicates assets by relatedAssetKey (asset family).
 *
 * Priority order:
 * 1. Primary asset (always wins within family - ensures groups are shown, not single variants)
 * 2. Exact symbol match (only if no primary exists in family)
 * 3. First asset in order (fallback)
 *
 * @param assets - Array of assets to deduplicate
 * @param searchString - The search string used to find these assets
 * @returns Array with one asset per family, preferring primary assets
 */
export function deduplicateAssets<T extends DeduplicatableAsset>(
  assets: T[],
  searchString?: string,
): T[] {
  const familyToAsset = new Map<string, T>()
  const searchLower = searchString?.toLowerCase() ?? ''

  const hasExactSymbolMatch = searchLower
    ? assets.some(a => isExactMatch(searchLower, a.symbol))
    : false

  for (const asset of assets) {
    const familyKey = asset.relatedAssetKey ?? asset.assetId
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
