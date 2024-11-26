import type { ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'
import { getMarketServiceManager } from 'state/slices/marketDataSlice/marketServiceManagerSingleton'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

const queryKey = ['getPopularAssetsQuery']

export const queryFn = async () => {
  const assetIds = await getMarketServiceManager().findAllSortedByVolumeDesc(100)
  const result: Record<ChainId | 'All', Asset[]> = {
    All: [],
  }

  const assets = selectAssets(store.getState())

  for (const assetId of assetIds) {
    const asset = assets[assetId]
    if (!asset) continue
    const { chainId } = asset
    if (!result[chainId]) result[chainId] = []
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
