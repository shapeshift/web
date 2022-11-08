import type { Asset } from '@keepkey/asset-service'
import type {
  AssetId,
  AssetReference,
  ChainId,
  ChainNamespace,
  ChainReference,
} from '@keepkey/caip'
import {
  ASSET_REFERENCE,
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE,
  fromAssetId,
  fromChainId,
  toAssetId,
} from '@keepkey/caip'
import { createSelector } from '@reduxjs/toolkit'
import cloneDeep from 'lodash/cloneDeep'
import sortBy from 'lodash/sortBy'
import createCachedSelector from 're-reselect'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectCryptoMarketDataIds } from 'state/slices/marketDataSlice/selectors'

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
  selectCryptoMarketDataIds,
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
const chainIdFeeAssetReferenceMap = (
  chainNamespace: ChainNamespace,
  chainReference: ChainReference,
): AssetReference => {
  return (() => {
    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Utxo:
        switch (chainReference) {
          case CHAIN_REFERENCE.BitcoinMainnet:
            return ASSET_REFERENCE.Bitcoin
          case CHAIN_REFERENCE.BitcoinCashMainnet:
            return ASSET_REFERENCE.BitcoinCash
          case CHAIN_REFERENCE.DogecoinMainnet:
            return ASSET_REFERENCE.Dogecoin
          case CHAIN_REFERENCE.LitecoinMainnet:
            return ASSET_REFERENCE.Litecoin
          default:
            throw new Error(`Chain namespace ${chainNamespace} on ${chainReference} not supported.`)
        }
      case CHAIN_NAMESPACE.Evm:
        switch (chainReference) {
          case CHAIN_REFERENCE.AvalancheCChain:
            return ASSET_REFERENCE.AvalancheC
          case CHAIN_REFERENCE.EthereumMainnet:
            return ASSET_REFERENCE.Ethereum
          default:
            throw new Error(`Chain namespace ${chainNamespace} on ${chainReference} not supported.`)
        }
      case CHAIN_NAMESPACE.CosmosSdk:
        switch (chainReference) {
          case CHAIN_REFERENCE.CosmosHubMainnet:
            return ASSET_REFERENCE.Cosmos
          case CHAIN_REFERENCE.OsmosisMainnet:
            return ASSET_REFERENCE.Osmosis
          case CHAIN_REFERENCE.ThorchainMainnet:
            return ASSET_REFERENCE.Thorchain
          default:
            throw new Error(`Chain namespace ${chainNamespace} on ${chainReference} not supported.`)
        }
      default:
        throw new Error(`Chain namespace ${chainNamespace} on ${chainReference} not supported.`)
    }
  })()
}

export const selectFeeAssetByChainId = createSelector(
  selectAssets,
  (_state: ReduxState, chainId: ChainId) => chainId,
  (assetsById, chainId): Asset => {
    const { chainNamespace, chainReference } = fromChainId(chainId)
    const feeAssetId = toAssetId({
      chainId,
      assetNamespace: 'slip44',
      assetReference: chainIdFeeAssetReferenceMap(chainNamespace, chainReference),
    })
    return assetsById[feeAssetId]
  },
)

export const selectFeeAssetById = createSelector(
  selectAssets,
  (_state: ReduxState, assetId: AssetId) => assetId,
  (assetsById, assetId): Asset => {
    const { chainNamespace, chainReference } = fromAssetId(assetId)
    const feeAssetId = toAssetId({
      chainNamespace,
      chainReference,
      assetNamespace: 'slip44',
      assetReference: chainIdFeeAssetReferenceMap(chainNamespace, chainReference),
    })
    return assetsById[feeAssetId]
  },
)
