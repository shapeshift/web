import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import orderBy from 'lodash/orderBy'
import createCachedSelector from 're-reselect'

import { assets } from './assetsSlice/assetsSlice'
import { selectAssetByFilter, selectAssets } from './assetsSlice/selectors'
import {
  selectPortfolioUserCurrencyBalances,
  selectWalletConnectedChainIds,
} from './common-selectors'
import { preferences } from './preferencesSlice/preferencesSlice'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
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
  assets.selectors.selectRelatedAssetIndex,
  selectAssetByFilter,
  selectWalletConnectedChainIds,
  selectOnlyConnectedChainsParamFromFilter,
  selectAssets,
  preferences.selectors.selectSpamMarkedAssetIds,
  (
    relatedAssetIndex,
    asset,
    walletConnectedChainIds,
    onlyConnectedChains,
    assets,
    spamMarkedAssetIds,
  ): AssetId[] => {
    if (!asset) return []
    const relatedAssetKey = asset.relatedAssetKey
    const isUsdt = asset.symbol?.toLowerCase().includes('usdt')
    if (isUsdt) console.log('[selectRelatedAssetIdsInclusive] USDT asset:', asset.assetId, 'relatedAssetKey:', relatedAssetKey)
    if (!relatedAssetKey) return [asset.assetId]

    const fromIndex = relatedAssetIndex[relatedAssetKey] ?? []
    if (isUsdt) console.log('[selectRelatedAssetIdsInclusive] USDT from relatedAssetIndex:', JSON.stringify(fromIndex))

    const relatedAssetIdsInclusiveWithDuplicates = [relatedAssetKey]
      .concat(fromIndex)
      // Filter out assetIds that are not in the assets store
      .filter(assetId => assets?.[assetId])

    if (isUsdt) console.log('[selectRelatedAssetIdsInclusive] USDT after filtering by assets store:', JSON.stringify(relatedAssetIdsInclusiveWithDuplicates))

    // `asset.assetId` may be the same as `relatedAssetKey`, so dedupe
    const relatedAssetIdsInclusive = Array.from(
      new Set(relatedAssetIdsInclusiveWithDuplicates),
    ).filter(assetId => {
      const isPrimaryAsset = assetId === asset.assetId
      const hasRelatedAssets = relatedAssetIdsInclusiveWithDuplicates.length > 1
      return (isPrimaryAsset && hasRelatedAssets) || !spamMarkedAssetIds.includes(assetId)
    })

    if (isUsdt) console.log('[selectRelatedAssetIdsInclusive] USDT after deduping and spam filter:', JSON.stringify(relatedAssetIdsInclusive))

    if (!onlyConnectedChains) return relatedAssetIdsInclusive

    const filtered = relatedAssetIdsInclusive.filter(assetId => {
      const { chainId } = fromAssetId(assetId)
      return walletConnectedChainIds.includes(chainId)
    })
    if (isUsdt) console.log('[selectRelatedAssetIdsInclusive] USDT after connected chains filter:', JSON.stringify(filtered))
    return filtered
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
    const isUsdt = relatedAssetIds.some(id => id.toLowerCase().includes('usdt') || id.toLowerCase().includes('0xdac17f958d2ee523a2206206994597c13d831ec7'))
    if (isUsdt) console.log('[selectRelatedAssetIdsInclusiveSorted] USDT relatedAssetIds:', JSON.stringify(relatedAssetIds))
    const result = orderBy(
      relatedAssetIds.map(assetId => {
        const { chainId } = fromAssetId(assetId)
        const adapter = chainAdapterManager.get(chainId)
        if (isUsdt) console.log('[selectRelatedAssetIdsInclusiveSorted] USDT assetId:', assetId, 'chainId:', chainId, 'hasAdapter:', !!adapter)
        return {
          assetId,
          balance: Number(portfolioUserCurrencyBalances[assetId] ?? '0'),
          chainName: adapter?.getDisplayName() ?? '',
        }
      }),
      ['balance', 'chainName'],
      ['desc', 'asc'],
    ).map(({ assetId }) => assetId)
    if (isUsdt) console.log('[selectRelatedAssetIdsInclusiveSorted] USDT sorted result:', JSON.stringify(result))
    return result
  },
)(
  (_s: ReduxState, filter) =>
    `${filter?.assetId ?? 'assetId'}-${filter?.onlyConnectedChains ?? false}`,
)
