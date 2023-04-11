import { createSelector } from '@reduxjs/toolkit'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import cloneDeep from 'lodash/cloneDeep'
import sortBy from 'lodash/sortBy'
import createCachedSelector from 're-reselect'
import { isSome } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAssetIdParamFromFilter } from 'state/selectors'
import { selectCryptoMarketDataIdsSortedByMarketCap } from 'state/slices/marketDataSlice/selectors'

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
  selectCryptoMarketDataIdsSortedByMarketCap,
  (assetsByIdOriginal, sortedMarketDataIds): Asset[] => {
    const assetById = cloneDeep(assetsByIdOriginal)
    // we only prefetch market data for some
    // and want this to be fairly performant so do some mutatey things
    // market data ids are already sorted by market cap
    const sortedWithMarketCap = sortedMarketDataIds.reduce<Asset[]>((acc, cur) => {
      const asset = assetById[cur]
      if (!asset) return acc
      acc.push(asset)
      delete assetById[cur]
      return acc
    }, [])
    const remainingSortedNoMarketCap = sortBy(Object.values(assetById), ['name', 'symbol'])
    return [...sortedWithMarketCap, ...remainingSortedNoMarketCap].filter(isSome)
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
