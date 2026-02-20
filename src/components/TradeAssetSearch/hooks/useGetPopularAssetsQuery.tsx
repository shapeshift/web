import type { ChainId } from '@shapeshiftoss/caip'
import {
  berachainAssetId,
  hyperEvmAssetId,
  inkAssetId,
  katanaAssetId,
  lineaAssetId,
  mayachainAssetId,
  megaethAssetId,
  monadAssetId,
  nearAssetId,
  plasmaAssetId,
  scrollAssetId,
  soneiumAssetId,
  starknetAssetId,
  suiAssetId,
  thorchainAssetId,
  tronAssetId,
} from '@shapeshiftoss/caip'
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

  // add second-class citizen chains to popular assets for discoverability
  if (enabledFlags.HyperEvm) assetIds.push(hyperEvmAssetId)
  if (enabledFlags.Monad) assetIds.push(monadAssetId)
  if (enabledFlags.Near) assetIds.push(nearAssetId)
  if (enabledFlags.Plasma) assetIds.push(plasmaAssetId)
  if (enabledFlags.MegaEth) assetIds.push(megaethAssetId)
  if (enabledFlags.Ink) assetIds.push(inkAssetId)
  if (enabledFlags.Scroll) assetIds.push(scrollAssetId)
  if (enabledFlags.Katana) assetIds.push(katanaAssetId)
  if (enabledFlags.Linea) assetIds.push(lineaAssetId)
  if (enabledFlags.Soneium) assetIds.push(soneiumAssetId)
  if (enabledFlags.Starknet) assetIds.push(starknetAssetId)
  if (enabledFlags.Tron) assetIds.push(tronAssetId)
  if (enabledFlags.Berachain) assetIds.push(berachainAssetId)
  if (enabledFlags.Sui) assetIds.push(suiAssetId)

  for (const assetId of [...new Set(assetIds)]) {
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
