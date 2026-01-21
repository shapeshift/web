import type { AssetId } from '@shapeshiftoss/caip'

import type { SearchableAsset } from './types'

type SearchableAssetMinimal = Pick<SearchableAsset, 'assetId' | 'symbol' | 'name'>

/**
 * Determines whether to search all assets or just primary assets.
 *
 * Returns true when the search term could match a non-primary asset
 * with a unique symbol (one that doesn't exist in primary assets), either by:
 * 1. Symbol prefix match (e.g., "AXLU" → "AXLUSDC")
 * 2. Name match (e.g., "Axelar Bridged" → "Axelar Bridged USDC")
 *
 * Examples:
 * - "BTC" → false (BTC is a primary symbol, no non-primary unique symbols match)
 * - "USD" → true (could match USDC.E which is a non-primary unique symbol)
 * - "AXLUSDC" → true (AXLUSDC is not a primary symbol)
 * - "VBUSD" → true (could match VBUSDC which is not a primary symbol)
 * - "Axelar Bridged" → true (matches name "Axelar Bridged USDC" of non-primary asset)
 * - "Lombard" → true (matches name "Lombard Staked BTC" if LBTC is a unique symbol)
 */
export const shouldSearchAllAssets = <T extends SearchableAssetMinimal>(
  searchQuery: string,
  allAssets: T[],
  primaryAssetIds: Set<AssetId>,
  primarySymbols: Set<string>,
): boolean => {
  const searchLower = searchQuery.toLowerCase()

  // Check if search could match a non-primary asset with a unique symbol
  // e.g., "VBUSD" → "VBUSDC" (which is not in primarySymbols)
  // or by name: "Axelar Bridged" → "Axelar Bridged USDC" (AXLUSDC is unique symbol)
  return allAssets.some(asset => {
    if (primaryAssetIds.has(asset.assetId)) return false
    const symbolLower = asset.symbol.toLowerCase()
    if (primarySymbols.has(symbolLower)) return false
    const nameLower = asset.name.toLowerCase()
    return symbolLower.startsWith(searchLower) || nameLower.includes(searchLower)
  })
}
