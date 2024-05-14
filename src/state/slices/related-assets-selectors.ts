import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import orderBy from 'lodash/orderBy'
import createCachedSelector from 're-reselect'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { ReduxState } from 'state/reducer'

import { selectAssetById } from './assetsSlice/selectors'
import { selectPortfolioUserCurrencyBalances, selectWalletChainIds } from './common-selectors'

/**
 * Selects all related assetIds, inclusive of the asset being queried.
 *
 * Excludes assetIds on chains that are not connected on the wallet.
 */
export const selectRelatedAssetIdsInclusive = createCachedSelector(
  (state: ReduxState) => state.assets.relatedAssetIndex,
  selectAssetById,
  selectWalletChainIds,
  (relatedAssetIndex, asset, walletConnectedChainIds): AssetId[] => {
    if (!asset) return []
    const relatedAssetKey = asset.relatedAssetKey
    if (!relatedAssetKey) return [asset.assetId]
    return [relatedAssetKey].concat(relatedAssetIndex[relatedAssetKey] ?? []).filter(assetId => {
      const { chainId } = fromAssetId(assetId)
      return walletConnectedChainIds.includes(chainId)
    })
  },
)((_state: ReduxState, assetId: AssetId | undefined): AssetId => assetId ?? 'undefined')

/**
 * Selects all related assetIds, exclusive of the asset being queried.
 *
 * Excludes assetIds on chains that are not connected on the wallet.
 */
export const selectRelatedAssetIds = createCachedSelector(
  selectRelatedAssetIdsInclusive,
  selectAssetById,
  (relatedAssetIdsInclusive, asset): AssetId[] => {
    return relatedAssetIdsInclusive.filter(assetId => assetId !== asset?.assetId) ?? []
  },
)((_state: ReduxState, assetId: AssetId | undefined): AssetId => assetId ?? 'undefined')

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
)((_state: ReduxState, assetId: AssetId | undefined): AssetId => assetId ?? 'undefined')
