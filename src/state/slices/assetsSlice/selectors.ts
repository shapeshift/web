import { createSelector } from '@reduxjs/toolkit'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import orderBy from 'lodash/orderBy'
import { matchSorter } from 'match-sorter'
import createCachedSelector from 're-reselect'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAssetIdParamFromFilter, selectSearchQueryFromFilter } from 'state/selectors'
import { selectMarketDataSortedByMarketCap } from 'state/slices/marketDataSlice/selectors'

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

export const selectAssetsByMarketCap = createDeepEqualOutputSelector(
  selectAssets,
  selectMarketDataSortedByMarketCap,
  (assets, cryptoMarketData): Asset[] => {
    const getAssetMarketCap = (asset: Asset) =>
      bnOrZero(cryptoMarketData[asset.assetId]?.marketCap).toNumber()
    const getAssetName = (asset: Asset) => asset.name

    return orderBy(
      Object.values(assets).filter(isSome),
      [getAssetMarketCap, getAssetName],
      ['desc', 'asc'],
    )
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
)((_s: ReduxState, assetId: AssetId) => assetId ?? 'assetId')

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
