import { createSelector } from '@reduxjs/toolkit'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId, isNft } from '@shapeshiftoss/caip'
import { matchSorter } from 'match-sorter'
import createCachedSelector from 're-reselect'
import type { Asset } from 'lib/asset-service'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAssetIdParamFromFilter, selectSearchQueryFromFilter } from 'state/selectors'

import { selectCryptoMarketDataIds } from '../marketDataSlice/selectors'
import { assetIdToFeeAssetId } from '../portfolioSlice/utils'
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

export const selectAssets = createDeepEqualOutputSelector(
  (state: ReduxState) => state.assets.byId,
  byId => byId,
)
export const selectAssetIds = (state: ReduxState) => state.assets.ids

// not deep equal output selector for perf reasons - hashing more expensive than selecting
export const selectNonNftAssetIds = createSelector(selectAssetIds, (assetIds): AssetId[] =>
  assetIds.filter(assetId => !isNft(assetId)),
)

// not deep equal output selector for perf reasons - hashing more expensive than selecting
export const selectNftAssetIds = createSelector(selectAssetIds, (assetIds): AssetId[] =>
  assetIds.filter(assetId => isNft(assetId)),
)

export const selectAssetsByMarketCap = createDeepEqualOutputSelector(
  selectCryptoMarketDataIds,
  selectAssets,
  (marketDataAssetIds, assets): Asset[] => {
    const sortedAssets = marketDataAssetIds.reduce<Asset[]>((acc, assetId) => {
      const asset = assets[assetId]
      if (asset) acc.push(asset)
      return acc
    }, [])

    return sortedAssets
  },
)

export const selectChainIdsByMarketCap = createDeepEqualOutputSelector(
  selectAssetsByMarketCap,
  (sortedAssets: Asset[]): ChainId[] =>
    sortedAssets.reduce<ChainId[]>((acc, { assetId }) => {
      const feeAssetId = assetIdToFeeAssetId(assetId)
      if (feeAssetId !== assetId) return acc
      const { chainId } = fromAssetId(feeAssetId)
      if (!acc.includes(chainId)) acc.push(chainId)
      return acc
    }, []),
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

export const selectAssetsBySearchQuery = createDeepEqualOutputSelector(
  selectAssetsByMarketCap,
  selectSearchQueryFromFilter,
  (sortedAssets: Asset[], searchQuery?: string): Asset[] => {
    if (!searchQuery) return sortedAssets
    return matchSorter(sortedAssets, searchQuery ?? '', {
      keys: ['name', 'symbol', 'assetId'],
      threshold: matchSorter.rankings.MATCHES,
    })
  },
)
