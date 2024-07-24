import { createSelector } from '@reduxjs/toolkit'
import { type AssetId, type ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import difference from 'lodash/difference'
import { matchSorter } from 'match-sorter'
import createCachedSelector from 're-reselect'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAssetIdParamFromFilter, selectSearchQueryFromFilter } from 'state/selectors'

import { selectMarketDataIdsSortedByMarketCapUsd } from '../marketDataSlice/selectors'
import { getFeeAssetByAssetId, getFeeAssetByChainId } from './utils'

export const selectAssetById = createCachedSelector(
  (state: ReduxState) => state.assets.byId,
  (_state: ReduxState, assetId: AssetId) => assetId,
  (byId, assetId) => byId[assetId] || undefined,
)((_state: ReduxState, assetId: AssetId | undefined): AssetId => assetId ?? 'undefined')

export const selectAssetByFilter = createCachedSelector(
  (state: ReduxState) => state.assets.byId,
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
  (state: ReduxState) => state.assets.byId,
  byId => byId,
)
export const selectAssetIds = (state: ReduxState) => state.assets.ids
export const selectRelatedAssetIndex = (state: ReduxState) => state.assets.relatedAssetIndex

export const selectAssetsSortedByMarketCap = createDeepEqualOutputSelector(
  selectMarketDataIdsSortedByMarketCapUsd,
  selectAssetIds,
  selectAssets,
  (marketDataAssetIds, assetIds, assets): Asset[] => {
    const nonMarketDataAssetIds = difference(assetIds, marketDataAssetIds)

    return marketDataAssetIds.concat(nonMarketDataAssetIds).reduce<Asset[]>((acc, assetId) => {
      const asset = assets[assetId]
      if (asset) acc.push(asset)
      return acc
    }, [])
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

export const selectAssetsBySearchQuery = createCachedSelector(
  selectAssetsSortedByMarketCap,
  selectSearchQueryFromFilter,
  (sortedAssets: Asset[], searchQuery?: string): Asset[] => {
    if (!searchQuery) return sortedAssets
    return matchSorter(sortedAssets, searchQuery ?? '', {
      keys: ['name', 'symbol', 'assetId'],
      threshold: matchSorter.rankings.CONTAINS,
    })
  },
)((_state: ReduxState, filter) => filter?.searchQuery ?? 'assetsBySearchQuery')
