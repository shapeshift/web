import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import orderBy from 'lodash/orderBy'
import createCachedSelector from 're-reselect'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { ReduxState } from 'state/reducer'
import { selectOnlyConnectedChainsParamFromFilter } from 'state/selectors'

import { selectAssetByFilter, selectAssets } from './assetsSlice/selectors'
import {
  selectPortfolioUserCurrencyBalances,
  selectWalletConnectedChainIds,
} from './common-selectors'

/**
 * Selects all related assetIds, inclusive of the asset being queried.
 *
 * Excludes assetIds on chains that are not connected on the wallet.
 * Excludes assetIds that are not in the assets slice.
 */
export const selectRelatedAssetIdsInclusive = createCachedSelector(
  (state: ReduxState) => state.assets.relatedAssetIndex,
  selectAssetByFilter,
  selectWalletConnectedChainIds,
  selectOnlyConnectedChainsParamFromFilter,
  selectAssets,
  (relatedAssetIndex, asset, walletConnectedChainIds, onlyConnectedChains, assets): AssetId[] => {
    if (!asset) return []
    const relatedAssetKey = asset.relatedAssetKey
    if (!relatedAssetKey) return [asset.assetId]

    const relatedAssetIdsInclusiveWithDuplicates = [relatedAssetKey]
      .concat(relatedAssetIndex[relatedAssetKey] ?? [])
      // Filter out assetIds that are not in the assets store
      .filter(assetId => assets?.[assetId])

    // `asset.assetId` may be the same as `relatedAssetKey`, so dedupe
    const relatedAssetIdsInclusive = Array.from(new Set(relatedAssetIdsInclusiveWithDuplicates))

    if (!onlyConnectedChains) return relatedAssetIdsInclusive

    return relatedAssetIdsInclusive.filter(assetId => {
      const { chainId } = fromAssetId(assetId)
      return walletConnectedChainIds.includes(chainId)
    })
  },
)(
  (_s: ReduxState, filter) =>
    `${filter?.assetId ?? 'assetId'}-${filter?.onlyConnectedChains ?? false}`,
)

/**
 * Selects all related assetIds, exclusive of the asset being queried.
 *
 * Excludes assetIds on chains that are not connected on the wallet.
 */
export const selectRelatedAssetIds = createCachedSelector(
  selectRelatedAssetIdsInclusive,
  selectAssetByFilter,
  (relatedAssetIdsInclusive, asset): AssetId[] => {
    return relatedAssetIdsInclusive.filter(assetId => assetId !== asset?.assetId) ?? []
  },
)(
  (_s: ReduxState, filter) =>
    `${filter?.assetId ?? 'assetId'}-${filter?.onlyConnectedChains ?? false}`,
)

export const selectRelatedAssetIdsInclusiveSorted = createCachedSelector(
  selectRelatedAssetIdsInclusive,
  selectPortfolioUserCurrencyBalances,
  (relatedAssetIds, portfolioUserCurrencyBalances) => {
    const chainAdapterManager = getChainAdapterManager()
    return orderBy(
      relatedAssetIds.map(assetId => {
        const { chainId } = fromAssetId(assetId)
        return {
          assetId,
          balance: Number(portfolioUserCurrencyBalances[assetId] ?? '0'),
          chainName: chainAdapterManager.get(chainId)?.getDisplayName() ?? '',
        }
      }),
      ['balance', 'chainName'],
      ['desc', 'asc'],
    ).map(({ assetId }) => assetId)
  },
)(
  (_s: ReduxState, filter) =>
    `${filter?.assetId ?? 'assetId'}-${filter?.onlyConnectedChains ?? false}`,
)
