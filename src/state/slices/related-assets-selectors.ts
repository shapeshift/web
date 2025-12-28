import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import orderBy from 'lodash/orderBy'
import createCachedSelector from 're-reselect'

import { selectAssetByFilter, selectAssets } from './assetsSlice/selectors'
import {
  selectPortfolioUserCurrencyBalances,
  selectWalletConnectedChainIds,
} from './common-selectors'
import { preferences } from './preferencesSlice/preferencesSlice'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { getAssetService } from '@/lib/asset-service'
import type { ReduxState } from '@/state/reducer'
import { selectOnlyConnectedChainsParamFromFilter } from '@/state/selectors'

/**
 * Selects all related assetIds, inclusive of the asset being queried.
 *
 * Excludes assetIds on chains that are not connected on the wallet.
 * Excludes assetIds that are not in the assets slice.
 * Excludes assetIds that are marked as spam.
 */
export const selectRelatedAssetIdsInclusive = createCachedSelector(
  selectAssetByFilter,
  selectWalletConnectedChainIds,
  selectOnlyConnectedChainsParamFromFilter,
  selectAssets,
  preferences.selectors.selectSpamMarkedAssetIds,
  (asset, walletConnectedChainIds, onlyConnectedChains, assets, spamMarkedAssetIds): AssetId[] => {
    if (!asset) return []
    const relatedAssetKey = asset.relatedAssetKey
    if (!relatedAssetKey) return [asset.assetId]

    const chainAdapterManager = getChainAdapterManager()
    const relatedAssetIndex = getAssetService().relatedAssetIndex

    const relatedAssetIdsInclusiveWithDuplicates = [relatedAssetKey]
      .concat(relatedAssetIndex[relatedAssetKey] ?? [])
      // Filter out assetIds that are not in the assets store
      .filter(assetId => assets?.[assetId])
      // Filter out assetIds for chains without registered adapters (e.g. chains behind disabled feature flags)
      .filter(assetId => {
        const { chainId } = fromAssetId(assetId)
        return chainAdapterManager.has(chainId)
      })

    // `asset.assetId` may be the same as `relatedAssetKey`, so dedupe
    const relatedAssetIdsInclusive = Array.from(
      new Set(relatedAssetIdsInclusiveWithDuplicates),
    ).filter(assetId => {
      const isPrimaryAsset = assetId === asset.assetId
      const hasRelatedAssets = relatedAssetIdsInclusiveWithDuplicates.length > 1
      return (isPrimaryAsset && hasRelatedAssets) || !spamMarkedAssetIds.includes(assetId)
    })

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
