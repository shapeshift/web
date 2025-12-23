import { createSelector } from '@reduxjs/toolkit'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset, AssetsById } from '@shapeshiftoss/types'
import { isSome } from '@shapeshiftoss/utils'
import createCachedSelector from 're-reselect'

import { assets } from './assetsSlice'
import { getFeeAssetByAssetId, getFeeAssetByChainId } from './utils'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import type { ReduxState } from '@/state/reducer'
import { createDeepEqualOutputSelector } from '@/state/selector-utils'
import { selectAssetIdParamFromFilter } from '@/state/selectors'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'

export const selectAssetById = createCachedSelector(
  assets.selectors.selectAssetsById,
  (_state: ReduxState, assetId: AssetId) => assetId,
  (byId, assetId) => byId[assetId] || undefined,
)((_state: ReduxState, assetId: AssetId | undefined): AssetId => assetId ?? 'undefined')

export const selectAssetByFilter = createCachedSelector(
  assets.selectors.selectAssetsById,
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

export const selectAssets = createDeepEqualOutputSelector(
  assets.selectors.selectAssetsById,
  byId => byId,
)

export const selectPrimaryAssets = createCachedSelector(assets.selectors.selectAssetsById, byId => {
  console.log('[selectPrimaryAssets] Called with byId keys:', Object.keys(byId).length)
  const chainAdapterManager = getChainAdapterManager()
  const result = Object.values(byId).reduce<AssetsById>((acc, asset) => {
    if (!asset) return acc

    if (!asset.isPrimary) {
      console.log('[selectPrimaryAssets] Asset missing isPrimary:', asset.assetId)
      return acc
    }

    // Filter out assets from chains without loaded adapters (feature flags off)
    if (!chainAdapterManager.get(asset.chainId)) return acc

    acc[asset.assetId] = asset
    return acc
  }, {})
  console.log('[selectPrimaryAssets] Returning:', Object.keys(result).length, 'primary assets')
  return result
})(() => 'primaryAssets')

export const selectAssetIds = createDeepEqualOutputSelector(
  assets.selectors.selectAssetIds,
  ids => ids,
)

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
