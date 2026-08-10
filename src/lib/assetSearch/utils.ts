import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId, isNft } from '@shapeshiftoss/caip'

import type { SearchableAsset } from './types'

import { isEvmAddress } from '@/lib/utils/isEvmAddress'

/** Minimum market cap threshold in USD to include in search results (filters spam tokens) */
export const MINIMUM_MARKET_CAP_THRESHOLD = 1000

/**
 * How far into the caller's market-cap-ordered list a primary can sit and still earn the symbol
 * bonus. Not a market cap rank - the list interleaves every chain variant of a coin, so a top-100
 * coin routinely sits several hundred entries deep.
 */
const MAX_HIGH_MARKET_CAP_INDEX = 2000

/**
 * Where a coin is dominant enough that a partial symbol match on it beats an exact one further
 * down - "dog" should find Dogecoin rather than the Dog rune, "b" should find Bitcoin.
 */
const TOP_MARKET_CAP_INDEX = 100

const SCORE = {
  TOP_SYMBOL_EXACT: -13,
  TOP_SYMBOL_PREFIX: -12,
  PRIMARY_SYMBOL_EXACT: -11,
  PRIMARY_NAME_EXACT: -10,
  PRIMARY_NAME_PREFIX: -6,
  PRIMARY_SYMBOL_PREFIX: -6,
  SYMBOL_EXACT: 0,
  SYMBOL_PREFIX: 10,
  SYMBOL_CONTAINS: 20,
  NAME_EXACT: 30,
  NAME_PREFIX: 40,
  NAME_CONTAINS: 50,
  ASSET_ID_CONTAINS: 60,
  NO_MATCH: 1000,
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

const scoreAsset = (asset: SearchableAsset, search: string, originalIndex: number): number => {
  const sym = asset.symbol.toLowerCase()
  const name = asset.name.toLowerCase()

  // Best score among all matches. The symbol bonus needs a short symbol and a high market cap, so
  // spam copying tickers like BTC can't earn it, and outranks a name-exact hit on any primary.
  if (asset.isPrimary) {
    let bestScore = SCORE.NO_MATCH as number
    if (name === search) bestScore = Math.min(bestScore, SCORE.PRIMARY_NAME_EXACT)
    if (name.startsWith(search)) bestScore = Math.min(bestScore, SCORE.PRIMARY_NAME_PREFIX)
    const isHighMarketCap = originalIndex < MAX_HIGH_MARKET_CAP_INDEX
    const isTopMarketCap = originalIndex < TOP_MARKET_CAP_INDEX
    if (sym.length <= 5 && isHighMarketCap) {
      if (sym === search)
        bestScore = Math.min(
          bestScore,
          isTopMarketCap ? SCORE.TOP_SYMBOL_EXACT : SCORE.PRIMARY_SYMBOL_EXACT,
        )
      if (sym.startsWith(search))
        bestScore = Math.min(
          bestScore,
          isTopMarketCap ? SCORE.TOP_SYMBOL_PREFIX : SCORE.PRIMARY_SYMBOL_PREFIX,
        )
    }
    if (bestScore < SCORE.NO_MATCH) return bestScore
  }

  if (sym === search) return SCORE.SYMBOL_EXACT
  if (sym.startsWith(search)) return SCORE.SYMBOL_PREFIX
  if (sym.includes(search)) return SCORE.SYMBOL_CONTAINS

  if (name === search) return SCORE.NAME_EXACT
  if (name.startsWith(search)) return SCORE.NAME_PREFIX
  if (name.includes(search)) return SCORE.NAME_CONTAINS

  if (asset.assetId.toLowerCase().includes(search)) return SCORE.ASSET_ID_CONTAINS

  return SCORE.NO_MATCH
}

export const searchAssets = <T extends SearchableAsset>(searchTerm: string, assets: T[]): T[] => {
  if (!assets?.length) return []
  if (!searchTerm) return assets

  if (isEvmAddress(searchTerm)) {
    return filterAssetsByEthAddress(searchTerm, assets)
  }

  const search = searchTerm.toLowerCase()

  const scored = assets
    .map((asset, originalIndex) => ({
      asset,
      score: scoreAsset(asset, search, originalIndex),
      originalIndex,
    }))
    .filter(x => x.score < SCORE.NO_MATCH)

  scored.sort((a, b) => {
    // Primary sort: by score (lower is better)
    if (a.score !== b.score) return a.score - b.score

    // Secondary sort (non-primary assets only): prefer assets with related assets over orphans
    // This helps legitimate bridged tokens rank above random LP/spam tokens
    // Skip for primary assets - they should be sorted purely by market cap
    if (!a.asset.isPrimary && !b.asset.isPrimary) {
      const aHasRelated = a.asset.relatedAssetKey != null
      const bHasRelated = b.asset.relatedAssetKey != null
      if (aHasRelated && !bHasRelated) return -1
      if (!aHasRelated && bHasRelated) return 1
    }

    // Tertiary sort: preserve original order (which should be by market cap)
    return a.originalIndex - b.originalIndex
  })

  return scored.map(x => x.asset)
}
