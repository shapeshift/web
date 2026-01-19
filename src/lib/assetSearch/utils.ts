import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId, isNft } from '@shapeshiftoss/caip'
import { matchSorter } from 'match-sorter'

import { ASSET_SEARCH_MATCH_SORTER_CONFIG } from './config'
import type { SearchableAsset } from './types'

import { isEvmAddress } from '@/lib/utils/isEvmAddress'

export const isSearchableAsset = (assetId: AssetId): boolean => !isNft(assetId)

export function isExactSymbolMatch(searchQuery: string, symbol: string): boolean {
  return searchQuery.toLowerCase() === symbol.toLowerCase()
}

export const filterAssetsByEthAddress = <T extends { assetId: AssetId }>(
  address: string,
  assets: T[],
): T[] => {
  const searchLower = address.toLowerCase()
  return assets.filter(
    asset => fromAssetId(asset.assetId).assetReference.toLowerCase() === searchLower,
  )
}

export const filterAssetsByChainSupport = <T extends { assetId: AssetId; chainId: ChainId }>(
  assets: T[],
  options: {
    activeChainId?: ChainId | 'All'
    allowWalletUnsupportedAssets?: boolean
    walletConnectedChainIds: ChainId[]
  },
): T[] => {
  const { activeChainId, allowWalletUnsupportedAssets, walletConnectedChainIds } = options

  return assets.filter(asset => {
    // Always filter out NFTs
    if (!isSearchableAsset(asset.assetId)) return false

    if (activeChainId === 'All') {
      if (allowWalletUnsupportedAssets) return true
      return walletConnectedChainIds.includes(asset.chainId)
    }

    if (
      activeChainId &&
      !allowWalletUnsupportedAssets &&
      !walletConnectedChainIds.includes(activeChainId)
    ) {
      return false
    }

    return activeChainId ? asset.chainId === activeChainId : false
  })
}

/**
 * Prioritizes search results by symbol match quality, then by original order (market cap).
 *
 * This ensures that when searching "usd":
 * 1. USDC, USDT appear first (symbols start with "usd")
 * 2. LP pools like "Yearn USDC yVault Pool" (name contains "usdc") appear after
 *
 * Without this, matchSorter would rank LP pools higher because their names contain
 * the search term while USDT's name "Tether" doesn't.
 *
 * Groups (in order of priority):
 * 1. Exact symbol match (search "usdc" → USDC)
 * 2. Symbol starts with search term (search "usd" → USDC, USDT, USDS)
 * 3. Other matches (name contains search term → LP pools, etc.)
 *
 * Within each group, assets maintain their original order (market cap).
 *
 * @param matchedAssets - Assets returned by matchSorter
 * @param originalAssets - Original input array (in market cap order)
 * @param searchTerm - The search term to match against
 */
export const prioritizeBySymbolMatch = <T extends SearchableAsset>(
  matchedAssets: T[],
  originalAssets: T[],
  searchTerm: string,
): T[] => {
  if (!matchedAssets.length || !searchTerm) return matchedAssets

  const searchLower = searchTerm.toLowerCase()
  const matchedIds = new Set(matchedAssets.map(a => a.assetId))

  // Get matched assets in original (market cap) order
  const matchedInOriginalOrder = originalAssets.filter(a => matchedIds.has(a.assetId))

  // Group by symbol match quality
  const exactSymbolMatch: T[] = []
  const symbolStartsWith: T[] = []
  const otherMatches: T[] = []

  for (const asset of matchedInOriginalOrder) {
    const symbolLower = asset.symbol.toLowerCase()

    if (symbolLower === searchLower) {
      exactSymbolMatch.push(asset)
    } else if (symbolLower.startsWith(searchLower)) {
      symbolStartsWith.push(asset)
    } else {
      otherMatches.push(asset)
    }
  }

  return [...exactSymbolMatch, ...symbolStartsWith, ...otherMatches]
}

export const searchAssets = <T extends SearchableAsset>(
  searchTerm: string,
  assets: T[],
  config = ASSET_SEARCH_MATCH_SORTER_CONFIG,
): T[] => {
  if (!assets) return []
  if (!searchTerm) return assets

  if (isEvmAddress(searchTerm)) {
    return filterAssetsByEthAddress(searchTerm, assets)
  }

  // Create an index map for O(1) lookup of original positions
  const indexMap = new Map(assets.map((asset, index) => [asset, index]))

  // Add baseSort to preserve input order (market cap) within same ranking tier
  const configWithBaseSort = {
    ...config,
    baseSort: (a: { item: T }, b: { item: T }) => {
      const indexA = indexMap.get(a.item) ?? 0
      const indexB = indexMap.get(b.item) ?? 0
      return indexA - indexB
    },
  }

  const results = matchSorter(assets, searchTerm, configWithBaseSort)

  // Prioritize by symbol match quality to ensure USDC/USDT appear before LP pools
  return prioritizeBySymbolMatch(results, assets, searchTerm)
}
