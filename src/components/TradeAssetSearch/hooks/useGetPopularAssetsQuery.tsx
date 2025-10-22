import type { ChainId } from '@shapeshiftoss/caip'
import { mayachainAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'

import { getMarketServiceManager } from '@/state/slices/marketDataSlice/marketServiceManagerSingleton'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectRelatedAssetIds } from '@/state/slices/related-assets-selectors'
import { selectAssets, selectPrimaryAssets } from '@/state/slices/selectors'
import { store } from '@/state/store'

const queryKey = ['getPopularAssetsQuery']

export const queryFn = async () => {
  const assetIds = await getMarketServiceManager().findAllSortedByMarketCapDesc(100)
  const result: Record<ChainId | 'All', Asset[]> = {
    All: [],
  }

  const assets = selectAssets(store.getState())
  const primaryAssets = selectPrimaryAssets(store.getState())
  const enabledFlags = preferences.selectors.selectFeatureFlags(store.getState())

  // add thorchain and mayachain to popular assets for discoverability on wallets without existing balances
  assetIds.push(thorchainAssetId)
  if (enabledFlags.Mayachain) assetIds.push(mayachainAssetId)

  for (const assetId of assetIds) {
    const asset = primaryAssets[assetId]
    const relatedAssetIds = selectRelatedAssetIds(store.getState(), { assetId })
    if (!asset) continue
    const { chainId } = asset
    if (!result[chainId]) result[chainId] = []

    relatedAssetIds.forEach(relatedAssetId => {
      const relatedAsset = assets[relatedAssetId]

      if (!relatedAsset) return

      const relatedAssetChainId = relatedAsset?.chainId

      if (!result[relatedAssetChainId]) result[relatedAssetChainId] = []

      result[relatedAssetChainId].push(relatedAsset)
    })

    result[chainId].push(asset)
    result.All.push(asset)
  }

  return result
}

export const useGetPopularAssetsQuery = () => {
  const popularAssetIdsQuery = useQuery({
    queryKey,
    queryFn,
    enabled: true,
    staleTime: Infinity,
  })

  return popularAssetIdsQuery
}
