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

  return matchSorter(assets, searchTerm, configWithBaseSort)
}
