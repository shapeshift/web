/**
 * Deduplicates assets by symbol, preferring primary assets over non-primary ones.
 *
 * This is useful when searching all assets returns multiple assets with the same
 * symbol on different chains (e.g., AXLUSDC on Arbitrum, Optimism, etc.).
 * The AssetRow component will handle showing all chain variants in the grouped view.
 *
 * When both a primary and non-primary asset share the same symbol, the primary
 * asset is kept regardless of order in the input array.
 *
 * @param assets - Array of assets to deduplicate
 * @returns Array with only one asset per unique symbol, preferring primary assets
 */
export function deduplicateAssetsBySymbol<T extends { symbol: string; isPrimary?: boolean }>(
  assets: T[],
): T[] {
  // First pass: find the best asset for each symbol (prefer primary)
  const symbolToAsset = new Map<string, T>()
  for (const asset of assets) {
    const symbolLower = asset.symbol.toLowerCase()
    const existing = symbolToAsset.get(symbolLower)
    if (!existing || (asset.isPrimary && !existing.isPrimary)) {
      symbolToAsset.set(symbolLower, asset)
    }
  }

  // Second pass: filter to keep only the selected assets, maintaining order
  const selectedAssets = new Set(symbolToAsset.values())
  return assets.filter(asset => selectedAssets.has(asset))
}
