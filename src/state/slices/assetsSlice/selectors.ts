import { createSelector } from '@reduxjs/toolkit'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset, AssetsById } from '@shapeshiftoss/types'
import { isSome } from '@shapeshiftoss/utils'
import createCachedSelector from 're-reselect'

import { assets } from './assetsSlice'
import { getFeeAssetByAssetId, getFeeAssetByChainId } from './utils'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { getAssetService } from '@/lib/asset-service'
import type { ReduxState } from '@/state/reducer'
import { createDeepEqualOutputSelector } from '@/state/selector-utils'
import { selectAssetIdParamFromFilter } from '@/state/selectors'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'

// Memoization cache for asset IDs derivation
// Object.keys() on 25k+ assets is expensive (~2.5ms), so we cache the result
let _cachedAssetIds: AssetId[] | null = null
let _cachedByIdRef: AssetsById | null = null

/**
 * Merges static assets from AssetService with runtime-discovered assets from Redux.
 * AssetService holds the 25k+ static assets loaded at app startup.
 * Redux only needs to hold runtime-discovered assets (NFTs, portfolio discoveries).
 * Runtime assets override static assets (for descriptions, etc.)
 */
const selectMergedAssetsById = createSelector(
  assets.selectors.selectAssetsById,
  assets.selectors.selectInitialized,
  (reduxAssets, _initialized): AssetsById => {
    const staticAssets = getAssetService().assetsById
    // If AssetService isn't initialized yet, fall back to Redux (empty)
    if (Object.keys(staticAssets).length === 0) {
      return reduxAssets as AssetsById
    }
    // Runtime assets override static (for upserted descriptions, etc.)
    // Only create new object if there are runtime assets to merge
    if (Object.keys(reduxAssets).length === 0) {
      return staticAssets
    }
    return { ...staticAssets, ...reduxAssets } as AssetsById
  },
)

/**
 * Memoized asset IDs selector that derives IDs from the merged assets.
 * Uses manual memoization since Object.keys() is expensive on large objects.
 */
const selectMergedAssetIds = createSelector(selectMergedAssetsById, (byId): AssetId[] => {
  // Return cached IDs if the byId reference hasn't changed
  if (byId === _cachedByIdRef && _cachedAssetIds) {
    return _cachedAssetIds
  }
  // AssetService already maintains sorted order, so we can use its assetIds if available
  const service = getAssetService()
  if (service.assetIds.length > 0) {
    _cachedAssetIds = service.assetIds
    _cachedByIdRef = byId
    return _cachedAssetIds
  }
  // Fallback: derive from Object.keys (expensive)
  _cachedAssetIds = Object.keys(byId) as AssetId[]
  _cachedByIdRef = byId
  return _cachedAssetIds
})

export const selectAssetById = createCachedSelector(
  selectMergedAssetsById,
  (_state: ReduxState, assetId: AssetId) => assetId,
  (byId, assetId) => byId[assetId] || undefined,
)((_state: ReduxState, assetId: AssetId | undefined): AssetId => assetId ?? 'undefined')

export const selectAssetByFilter = createCachedSelector(
  selectMergedAssetsById,
  selectAssetIdParamFromFilter,
  (byId, assetId) => byId[assetId ?? ''] || undefined,
)((_s: ReduxState, filter) => filter?.assetId ?? 'assetId')

export const selectAssetNameById = createSelector(
  selectAssetById,
  (asset): string => asset?.name ?? '',
)

export const selectChainDisplayNameByAssetId = createSelector(selectAssetById, (asset): string => {
  if (!asset) return ''
  const chainAdapterManager = getChainAdapterManager()
  return chainAdapterManager.get(asset.chainId)?.getDisplayName() ?? ''
})

export const selectAssets = createDeepEqualOutputSelector(selectMergedAssetsById, byId => byId)

export const selectPrimaryAssets = createCachedSelector(selectMergedAssetsById, byId => {
  const chainAdapterManager = getChainAdapterManager()
  return Object.values(byId).reduce<AssetsById>((acc, asset) => {
    if (!asset || !asset.isPrimary) return acc

    // Filter out assets from chains without loaded adapters (feature flags off)
    if (!chainAdapterManager.get(asset.chainId)) return acc

    acc[asset.assetId] = asset
    return acc
  }, {})
})(() => 'primaryAssets')

export const selectAssetIds = createDeepEqualOutputSelector(selectMergedAssetIds, ids => ids)

export const selectAssetsSortedByMarketCap = createDeepEqualOutputSelector(
  selectAssetIds,
  selectAssets,
  (assetIds, assets): Asset[] => {
    // The asset data is already maintained in order by market cap, so map the IDs into assets
    return assetIds.map(assetId => assets[assetId]).filter(isSome)
  },
)

export const selectPrimaryAssetsSortedByMarketCap = createDeepEqualOutputSelector(
  selectAssetIds,
  selectPrimaryAssets,
  (assetIds, assets): Asset[] => {
    return assetIds.map(assetId => assets[assetId]).filter(isSome)
  },
)

export const selectFeeAssetByChainId = createCachedSelector(
  selectAssets,
  (_state: ReduxState, chainId: ChainId) => chainId,
  (assetsById, chainId): Asset | undefined => getFeeAssetByChainId(assetsById, chainId),
)((_state: ReduxState, chainId) => chainId ?? 'chainId')

export const selectFeeAssetById = createCachedSelector(
  selectAssets,
  (_state: ReduxState, assetId: AssetId) => assetId,
  (assetsById, assetId): Asset | undefined => getFeeAssetByAssetId(assetsById, assetId),
)((_s: ReduxState, assetId: AssetId) => assetId ?? 'assetId') as (
  state: ReduxState,
  assetId: AssetId,
) => ReturnType<typeof getFeeAssetByAssetId>

export const selectAssetsNoSpam = createSelector(
  selectPrimaryAssetsSortedByMarketCap,
  preferences.selectors.selectSpamMarkedAssetIds,
  (assets, spamMarkedAssetIds) => {
    const spamAssetSet = new Set(spamMarkedAssetIds)
    return assets.filter(({ assetId }) => !spamAssetSet.has(assetId))
  },
)

export const selectPrimaryAssetsSortedByMarketCapNoSpam = createDeepEqualOutputSelector(
  selectPrimaryAssetsSortedByMarketCap,
  preferences.selectors.selectSpamMarkedAssetIds,
  (assets, spamMarkedAssetIds) => {
    const spamAssetSet = new Set(spamMarkedAssetIds)
    return assets.filter(({ assetId }) => !spamAssetSet.has(assetId))
  },
)
