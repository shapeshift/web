import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId, isNft } from '@shapeshiftoss/caip'

import type { SearchableAsset } from './types'

import { isEvmAddress } from '@/lib/utils/isEvmAddress'

/** Minimum market cap threshold in USD to include in search results (filters spam tokens) */
export const MINIMUM_MARKET_CAP_THRESHOLD = 1000

export function isSearchableAsset(assetId: AssetId): boolean {
  return !isNft(assetId)
}

export function isExactSymbolMatch(searchQuery: string, symbol: string): boolean {
  return searchQuery.toLowerCase() === symbol.toLowerCase()
}

export function filterAssetsByEthAddress<T extends { assetId: AssetId }>(
  address: string,
  assets: T[],
): T[] {
  const searchLower = address.toLowerCase()
  return assets.filter(
    asset => fromAssetId(asset.assetId).assetReference.toLowerCase() === searchLower,
  )
}

export function filterAssetsByChainSupport<T extends { assetId: AssetId; chainId: ChainId }>(
  assets: T[],
  options: {
    activeChainId?: ChainId | 'All'
    allowWalletUnsupportedAssets?: boolean
    walletConnectedChainIds: ChainId[]
  },
): T[] {
  const { activeChainId, allowWalletUnsupportedAssets, walletConnectedChainIds } = options

  if (!activeChainId) return []

  const isChainSupported =
    allowWalletUnsupportedAssets || walletConnectedChainIds.includes(activeChainId as ChainId)

  if (activeChainId !== 'All' && !isChainSupported) return []

  return assets.filter(asset => {
    // Always filter out NFTs
    if (!isSearchableAsset(asset.assetId)) return false

    if (activeChainId === 'All') {
      return allowWalletUnsupportedAssets || walletConnectedChainIds.includes(asset.chainId)
    }

    return asset.chainId === activeChainId
  })
}

function scoreAsset(asset: SearchableAsset, search: string): number {
  const sym = asset.symbol.toLowerCase()
  const name = asset.name.toLowerCase()

  if (sym === search) return 0
  if (sym.startsWith(search)) return 10
  if (sym.includes(search)) return 20

  if (name === search) return 30
  if (name.startsWith(search)) return 40
  if (name.includes(search)) return 50

  if (asset.assetId.toLowerCase().includes(search)) return 60

  return 1000
}

export function searchAssets<T extends SearchableAsset>(searchTerm: string, assets: T[]): T[] {
  if (!assets?.length) return []
  if (!searchTerm) return assets

  if (isEvmAddress(searchTerm)) {
    return filterAssetsByEthAddress(searchTerm, assets)
  }

  const search = searchTerm.toLowerCase()

  const scored = assets
    .map((asset, originalIndex) => ({
      asset,
      score: scoreAsset(asset, search),
      originalIndex,
    }))
    .filter(x => x.score < 1000)

  scored.sort((a, b) => a.score - b.score || a.originalIndex - b.originalIndex)

  return scored.map(x => x.asset)
}
