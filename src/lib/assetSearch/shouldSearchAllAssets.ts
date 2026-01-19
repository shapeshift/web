import type { AssetId } from '@shapeshiftoss/caip'

/**
 * Determines whether to search all assets or just primary assets.
 *
 * Returns true when the search term could match a non-primary asset
 * with a unique symbol (one that doesn't exist in primary assets).
 *
 * Examples:
 * - "BTC" → false (BTC is a primary symbol, no non-primary unique symbols start with "btc")
 * - "USD" → true (could match USDC.E which is a non-primary unique symbol)
 * - "AXLUSDC" → true (AXLUSDC is not a primary symbol)
 * - "VBUSD" → true (could match VBUSDC which is not a primary symbol)
 *
 * @param searchQuery - The search term
 * @param allAssets - All available assets
 * @param primaryAssetIds - Set of asset IDs that are primary
 * @param primarySymbols - Set of symbols from primary assets (lowercase)
 */
export function shouldSearchAllAssets<T extends { assetId: AssetId; symbol: string }>(
  searchQuery: string,
  allAssets: T[],
  primaryAssetIds: Set<AssetId>,
  primarySymbols: Set<string>,
): boolean {
  const searchLower = searchQuery.toLowerCase()

  // Check if search could match a non-primary asset with a unique symbol
  // e.g., "VBUSD" → "VBUSDC" (which is not in primarySymbols)
  // We check this REGARDLESS of whether a primary symbol also matches,
  // because "vbusd" could match both VBUSD (primary) and VBUSDC (non-primary unique)
  return allAssets.some(asset => {
    if (primaryAssetIds.has(asset.assetId)) return false
    const symbolLower = asset.symbol.toLowerCase()
    if (primarySymbols.has(symbolLower)) return false
    return symbolLower.startsWith(searchLower)
  })
}
