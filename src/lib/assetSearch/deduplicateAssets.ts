import type { AssetId } from '@shapeshiftoss/caip'

type DeduplicatableAsset = {
  assetId: AssetId
  symbol: string
  isPrimary?: boolean
  relatedAssetKey?: AssetId | null
}

/**
 * Deduplicates assets by relatedAssetKey (asset family), with smart handling for exact symbol matches.
 *
 * This ensures that:
 * - General searches like "usd" show one row per asset family (USDC, USDT) not multiple variants (USDT + USDT0)
 * - Specific searches like "axlusdc" or "usdt0" show that specific variant (exact match takes priority)
 * - Primary assets are preferred when no exact symbol match exists
 *
 * @param assets - Array of assets to deduplicate
 * @param searchString - The search string used to find these assets
 * @returns Array with one asset per family, preferring exact matches then primary assets
 */
export function deduplicateAssets<T extends DeduplicatableAsset>(
  assets: T[],
  searchString?: string,
): T[] {
  const familyToAsset = new Map<string, T>()
  const searchLower = searchString?.toLowerCase() || ''

  // First pass: identify if search exactly matches any symbol in results
  const exactMatchSymbol = assets.find(a => a.symbol.toLowerCase() === searchLower)?.symbol

  // Second pass: find the best asset for each family
  for (const asset of assets) {
    // Use relatedAssetKey as family key, fall back to assetId for chain-specific assets
    const familyKey = asset.relatedAssetKey || asset.assetId
    const existing = familyToAsset.get(familyKey)

    // Priority rules:
    // 1. Exact symbol match for non-primary (if searching for specific variant)
    // 2. Primary asset (default for general searches)
    // 3. First occurrence (fallback)

    const isExactMatch =
      exactMatchSymbol && asset.symbol.toLowerCase() === exactMatchSymbol.toLowerCase()
    const existingIsExactMatch =
      existing &&
      exactMatchSymbol &&
      existing.symbol.toLowerCase() === exactMatchSymbol.toLowerCase()

    if (!existing) {
      familyToAsset.set(familyKey, asset)
    } else if (isExactMatch && !existingIsExactMatch) {
      // Prefer exact symbol match
      familyToAsset.set(familyKey, asset)
    } else if (!existingIsExactMatch && asset.isPrimary && !existing.isPrimary) {
      // Prefer primary if no exact match
      familyToAsset.set(familyKey, asset)
    }
  }

  // Third pass: filter to keep only selected assets, maintaining order
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
