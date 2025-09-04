import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId, isNft } from '@shapeshiftoss/caip'
import { matchSorter } from 'match-sorter'

import { ASSET_SEARCH_MATCH_SORTER_CONFIG } from './config'
import type { SearchableAsset } from './types'

import { isEthAddress } from '@/lib/utils/ethAddress'

export const isSearchableAsset = (assetId: AssetId): boolean => !isNft(assetId)

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
    relatedAssetIdsById: Record<AssetId, AssetId[]>
  },
): T[] => {
  const {
    activeChainId,
    allowWalletUnsupportedAssets,
    walletConnectedChainIds,
    relatedAssetIdsById,
  } = options

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

    if (
      activeChainId &&
      relatedAssetIdsById[asset.assetId]?.some(relatedAssetId =>
        walletConnectedChainIds.includes(fromAssetId(relatedAssetId).chainId),
      )
    )
      return true

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

  if (isEthAddress(searchTerm)) {
    return filterAssetsByEthAddress(searchTerm, assets)
  }

  return matchSorter(assets, searchTerm, config)
}
