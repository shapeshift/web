import { createSelector } from '@reduxjs/toolkit'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { orderBy } from 'lodash'
import { matchSorter } from 'match-sorter'
import createCachedSelector from 're-reselect'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { isSome } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAssetIdParamFromFilter, selectSearchQueryFromFilter } from 'state/selectors'

import { selectMarketDataIdsSortedByMarketCapUsd } from '../marketDataSlice/selectors'
import { getFeeAssetByAssetId, getFeeAssetByChainId } from './utils'

export const selectAssetById = createCachedSelector(
  (state: ReduxState) => state.assets,
  (_state: ReduxState, assetId: AssetId) => assetId,
  (assetsState: ReduxState['assets'], assetId) => {
    return assetsState.fungible.byId[assetId] ?? assetsState.nonFungible.byId[assetId]
  },
)((_state: ReduxState, assetId: AssetId | undefined): AssetId => assetId ?? 'undefined')

// selects all related assetIds, inclusive of the asset being queried
export const selectRelatedAssetIdsInclusive = createCachedSelector(
  (state: ReduxState) => state.assets.relatedAssetIndex,
  selectAssetById,
  (relatedAssetIndex, asset): AssetId[] => {
    if (!asset) return []
    const relatedAssetKey = asset.relatedAssetKey
    if (!relatedAssetKey) return [asset.assetId]
    return [relatedAssetKey].concat(relatedAssetIndex[relatedAssetKey] ?? [])
  },
)((_state: ReduxState, assetId: AssetId | undefined): AssetId => assetId ?? 'undefined')

// selects all related assetIds, exclusive of the asset being queried
export const selectRelatedAssetIds = createCachedSelector(
  selectRelatedAssetIdsInclusive,
  selectAssetById,
  (relatedAssetIdsInclusive, asset): AssetId[] => {
    return relatedAssetIdsInclusive.filter(assetId => assetId !== asset?.assetId) ?? []
  },
)((_state: ReduxState, assetId: AssetId | undefined): AssetId => assetId ?? 'undefined')

export const selectAssetByFilter = createCachedSelector(
  (state: ReduxState) => state,
  selectAssetIdParamFromFilter,
  (state, assetId) => (assetId ? selectAssetById(state, assetId) : undefined),
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

export const selectFungibleAssets = (state: ReduxState) => state.assets.fungible.byId
export const selectNonFungibleAssets = createDeepEqualOutputSelector(
  (state: ReduxState) => {
    return state.assets.nonFungible.byId
  },
  byId => byId,
)
export const selectFungibleAssetIds = (state: ReduxState) => state.assets.fungible.ids
export const selectNonFungibleAssetIds = createDeepEqualOutputSelector(
  (state: ReduxState) => {
    return state.assets.nonFungible.ids
  },
  ids => ids,
)
export const selectRelatedAssetIndex = (state: ReduxState) => state.assets.relatedAssetIndex
export const selectFungibleAssetsSortedByName = createDeepEqualOutputSelector(
  selectFungibleAssets,
  assets => {
    const getAssetName = (asset: Asset) => asset.name
    return orderBy(Object.values(assets).filter(isSome), [getAssetName], ['asc'])
  },
)

export const selectFungibleAssetsSortedByMarketCap = createDeepEqualOutputSelector(
  selectMarketDataIdsSortedByMarketCapUsd,
  selectFungibleAssets,
  (marketDataAssetIds, assets): Asset[] => {
    const sortedAssets = marketDataAssetIds.reduce<Asset[]>((acc, assetId) => {
      const asset = assets[assetId]
      if (asset) acc.push(asset)
      return acc
    }, [])

    return sortedAssets
  },
)

export const selectFeeAssetByChainId = createCachedSelector(
  selectFungibleAssets,
  (_state: ReduxState, chainId: ChainId) => chainId,
  (assetsById, chainId): Asset | undefined => getFeeAssetByChainId(assetsById, chainId),
)((_state: ReduxState, chainId) => chainId ?? 'chainId')

export const selectFeeAssetById = createCachedSelector(
  selectFungibleAssets,
  (_state: ReduxState, assetId: AssetId) => assetId,
  (assetsById, assetId): Asset | undefined => getFeeAssetByAssetId(assetsById, assetId),
)((_s: ReduxState, assetId: AssetId) => assetId ?? 'assetId') as (
  state: ReduxState,
  assetId: AssetId,
) => ReturnType<typeof getFeeAssetByAssetId>

export const selectFungibleAssetsBySearchQuery = createDeepEqualOutputSelector(
  selectFungibleAssetsSortedByMarketCap,
  selectSearchQueryFromFilter,
  (sortedAssets: Asset[], searchQuery?: string): Asset[] => {
    if (!searchQuery) return sortedAssets
    return matchSorter(sortedAssets, searchQuery ?? '', {
      keys: ['name', 'symbol', 'assetId'],
      threshold: matchSorter.rankings.CONTAINS,
    })
  },
)
