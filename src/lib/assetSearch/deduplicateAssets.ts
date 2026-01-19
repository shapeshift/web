import type { AssetId } from '@shapeshiftoss/caip'

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

  const hasExactSymbolMatch = assets.some(a => a.symbol.toLowerCase() === searchLower)

  for (const asset of assets) {
    const familyKey = asset.relatedAssetKey ?? asset.assetId
    const existing = familyToAsset.get(familyKey)

    const isExactMatch = hasExactSymbolMatch && asset.symbol.toLowerCase() === searchLower
    const existingIsExactMatch =
      hasExactSymbolMatch && existing?.symbol.toLowerCase() === searchLower

    if (!existing) {
      familyToAsset.set(familyKey, asset)
    } else if (asset.isPrimary && !existing.isPrimary) {
      familyToAsset.set(familyKey, asset)
    } else if (isExactMatch && !existingIsExactMatch && !existing.isPrimary) {
      familyToAsset.set(familyKey, asset)
    }
  }

  const selectedAssets = new Set(familyToAsset.values())
  return assets.filter(asset => selectedAssets.has(asset))
}

/**
 * @deprecated Use deduplicateAssets instead which handles relatedAssetKey properly
 *
 * Deduplicates assets by symbol, preferring primary assets over non-primary ones.
 */
export function deduplicateAssetsBySymbol<T extends { symbol: string; isPrimary?: boolean }>(
  assets: T[],
): T[] {
  const symbolToAsset = new Map<string, T>()
  for (const asset of assets) {
    const symbolLower = asset.symbol.toLowerCase()
    const existing = symbolToAsset.get(symbolLower)
    if (!existing || (asset.isPrimary && !existing.isPrimary)) {
      symbolToAsset.set(symbolLower, asset)
    }
  }

  const selectedAssets = new Set(symbolToAsset.values())
  return assets.filter(asset => selectedAssets.has(asset))
}
