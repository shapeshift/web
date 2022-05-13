import { createSelector } from '@reduxjs/toolkit'
import {
  AssetId,
  AssetNamespace,
  AssetReference,
  ChainId,
  fromAssetId,
  fromChainId,
  toAssetId,
} from '@shapeshiftoss/caip'
import { Asset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import cloneDeep from 'lodash/cloneDeep'
import sortBy from 'lodash/sortBy'
import createCachedSelector from 're-reselect'
import { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectMarketDataIds } from 'state/slices/marketDataSlice/selectors'

export const selectAssetById = createCachedSelector(
  (state: ReduxState) => state.assets.byId,
  (_state: ReduxState, assetId: AssetId) => assetId,
  (byId, assetId) => byId[assetId] || undefined,
)((_state: ReduxState, assetId: AssetId | undefined): AssetId => assetId ?? 'undefined')

export const selectAssetNameById = createSelector(
  selectAssetById,
  (asset): string => asset?.name ?? '',
)

export const selectAssets = createDeepEqualOutputSelector(
  (state: ReduxState) => state.assets.byId,
  byId => byId,
)
export const selectAssetIds = (state: ReduxState) => state.assets.ids

export const selectAssetsByMarketCap = createSelector(
  selectAssets,
  selectMarketDataIds,
  (assetsByIdOriginal, marketDataIds) => {
    const assetById = cloneDeep(assetsByIdOriginal)
    // we only prefetch market data for some
    // and want this to be fairly performant so do some mutatey things
    // market data ids are already sorted by market cap
    const sortedWithMarketCap = marketDataIds.reduce<Asset[]>((acc, cur) => {
      const asset = assetById[cur]
      if (!asset) return acc
      acc.push(asset)
      delete assetById[cur]
      return acc
    }, [])
    const remainingSortedNoMarketCap = sortBy(Object.values(assetById), ['name', 'symbol'])
    return [...sortedWithMarketCap, ...remainingSortedNoMarketCap]
  },
)

// @TODO figure out a better way to do this mapping. This is a stop gap to make selectFeeAssetById
// work with the update to the toAssetId function where assetNamespace and assetReference are now required.
const chainIdFeeAssetReferenceMap = (chain: ChainTypes, network: NetworkTypes): AssetReference => {
  if (chain === ChainTypes.Bitcoin) return AssetReference.Bitcoin
  if (chain === ChainTypes.Ethereum) return AssetReference.Ethereum
  if (chain === ChainTypes.Cosmos) {
    if (network === NetworkTypes.COSMOSHUB_MAINNET) return AssetReference.Cosmos
    if (network === NetworkTypes.OSMOSIS_MAINNET) return AssetReference.Osmosis
    throw new Error(`Network ${network} on ${chain} not supported.`)
  }
  throw new Error(`Chain ${chain} not supported.`)
}

export const selectFeeAssetByChainId = createSelector(
  selectAssets,
  (_state: ReduxState, chainId: ChainId) => chainId,
  (assetsById, chainId): Asset => {
    const { chain, network } = fromChainId(chainId)
    const feeAssetId = toAssetId({
      chain,
      network,
      assetNamespace: AssetNamespace.Slip44,
      assetReference: chainIdFeeAssetReferenceMap(chain, network),
    })
    return assetsById[feeAssetId]
  },
)

export const selectFeeAssetById = createSelector(
  selectAssets,
  (_state: ReduxState, assetId: AssetId) => assetId,
  (assetsById, assetId): Asset => {
    const { chain, network } = fromAssetId(assetId)
    const feeAssetId = toAssetId({
      chain,
      network,
      assetNamespace: AssetNamespace.Slip44,
      assetReference: chainIdFeeAssetReferenceMap(chain, network),
    })
    return assetsById[feeAssetId]
  },
)
