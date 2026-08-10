import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId, isNft } from '@shapeshiftoss/caip'

import type { SearchableAsset } from './types'

import { isEvmAddress } from '@/lib/utils/isEvmAddress'

/** Minimum market cap threshold in USD to include in search results (filters spam tokens) */
export const MINIMUM_MARKET_CAP_THRESHOLD = 1000

/**
 * Shortest query allowed to match against an assetId. That match exists for partial contract
 * address search, but addresses are hex - so "b" alone matches virtually every EVM asset.
 */
const MIN_ASSET_ID_SEARCH_LENGTH = 6

/**
 * How well an asset matches, lower being better. A primary outranks a chain variant or a spam
 * token at every tier, so searching "bitcoin" finds BTC rather than a token whose symbol is
 * literally BITCOIN.
 */
const MATCH = {
  PRIMARY_SYMBOL_EXACT: 0,
  PRIMARY_NAME_EXACT: 1,
  PRIMARY_SYMBOL_PREFIX: 2,
  PRIMARY_NAME_PREFIX: 3,
  SYMBOL_EXACT: 4,
  SYMBOL_PREFIX: 5,
  NAME_EXACT: 6,
  NAME_PREFIX: 7,
  SYMBOL_CONTAINS: 8,
  NAME_CONTAINS: 9,
  ASSET_ID_CONTAINS: 10,
  NONE: 11,
} as const

export const isSearchableAsset = (assetId: AssetId): boolean => !isNft(assetId)

export const isExactMatch = (searchQuery: string, symbol: string): boolean =>
  searchQuery.toLowerCase() === symbol.toLowerCase()

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

  if (!activeChainId) return []

  const isChainSupported =
    allowWalletUnsupportedAssets || walletConnectedChainIds.includes(activeChainId as ChainId)

  if (activeChainId !== 'All' && !isChainSupported) return []

  return assets.filter(asset => {
    if (!isSearchableAsset(asset.assetId)) return false

    if (activeChainId === 'All') {
      return allowWalletUnsupportedAssets || walletConnectedChainIds.includes(asset.chainId)
    }

    return asset.chainId === activeChainId
  })
}

const matchAsset = (asset: SearchableAsset, search: string): number => {
  const sym = asset.symbol.toLowerCase()
  const name = asset.name.toLowerCase()

  if (asset.isPrimary) {
    if (sym === search) return MATCH.PRIMARY_SYMBOL_EXACT
    if (name === search) return MATCH.PRIMARY_NAME_EXACT
    if (sym.startsWith(search)) return MATCH.PRIMARY_SYMBOL_PREFIX
    if (name.startsWith(search)) return MATCH.PRIMARY_NAME_PREFIX
  }

  if (sym === search) return MATCH.SYMBOL_EXACT
  if (sym.startsWith(search)) return MATCH.SYMBOL_PREFIX
  if (name === search) return MATCH.NAME_EXACT
  if (name.startsWith(search)) return MATCH.NAME_PREFIX
  if (sym.includes(search)) return MATCH.SYMBOL_CONTAINS
  if (name.includes(search)) return MATCH.NAME_CONTAINS

  // Only the reference, never the whole assetId - chain names live in the CAIP prefix, so matching
  // the lot means "starknet" hits every asset on Starknet rather than STRK
  if (
    search.length >= MIN_ASSET_ID_SEARCH_LENGTH &&
    asset.assetId.slice(asset.assetId.lastIndexOf(':') + 1).toLowerCase().includes(search)
  )
    return MATCH.ASSET_ID_CONTAINS

  return MATCH.NONE
}

/**
 * Whether the query hit the symbol or the head of the name, rather than turning up somewhere inside
 * them. "fox" matches ViFoxCoin, but not in a way that should outrank FOX.
 */
export const isStrongMatch = (asset: SearchableAsset, searchTerm: string): boolean =>
  matchAsset(asset, searchTerm.toLowerCase()) <= MATCH.NAME_PREFIX

export const searchAssets = <T extends SearchableAsset>(searchTerm: string, assets: T[]): T[] => {
  if (!assets?.length) return []
  if (!searchTerm) return assets

  if (isEvmAddress(searchTerm)) {
    return filterAssetsByEthAddress(searchTerm, assets)
  }

  const search = searchTerm.toLowerCase()

  return assets
    .map((asset, originalIndex) => ({ asset, match: matchAsset(asset, search), originalIndex }))
    .filter(x => x.match < MATCH.NONE)
    .sort((a, b) => {
      if (a.match !== b.match) return a.match - b.match

      // Within a tier, a bridged token beats a random LP or orphan
      const aHasRelated = a.asset.relatedAssetKey != null
      const bHasRelated = b.asset.relatedAssetKey != null
      if (aHasRelated !== bHasRelated) return aHasRelated ? -1 : 1

      return a.originalIndex - b.originalIndex
    })
    .map(x => x.asset)
}
