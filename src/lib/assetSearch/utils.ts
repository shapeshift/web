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
 * Prioritizes primary assets over non-primary assets in search results,
 * re-sorting primary assets by their original input order (market cap).
 *
 * After matchSorter finds relevant assets, this function ensures that primary assets
 * (major/canonical tokens like USDC, USDT) appear before non-primary assets (bridged
 * variants, wrapped tokens). Unlike simple filtering, this re-sorts primary assets
 * by their original position in the input array, which corresponds to market cap order.
 *
 * This solves a critical issue: matchSorter ranks by match quality, so "Tether" (USDT)
 * ranks lower than "USDT0" when searching "usd" because "Tether" doesn't contain "usd"
 * in the name. By re-sorting primaries by market cap, USDT appears before obscure tokens.
 *
 * @param matchedAssets - Assets returned by matchSorter (in match quality order)
 * @param originalAssets - Original input array (in market cap order)
 */
export const prioritizePrimaryAssets = <T extends SearchableAsset>(
  matchedAssets: T[],
  originalAssets: T[],
): T[] => {
  if (!matchedAssets.length) return matchedAssets

  // Create a set of matched asset IDs for O(1) lookup
  const matchedIds = new Set(matchedAssets.map(a => a.assetId))

  // Get primary assets in original (market cap) order
  const primaryAssets = originalAssets.filter(a => a.isPrimary && matchedIds.has(a.assetId))

  // Get non-primary assets in matchSorter order
  const nonPrimaryAssets = matchedAssets.filter(a => !a.isPrimary)

  return [...primaryAssets, ...nonPrimaryAssets]
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

  // Prioritize primary assets (in market cap order) over non-primary assets
  return prioritizePrimaryAssets(results, assets)
}
