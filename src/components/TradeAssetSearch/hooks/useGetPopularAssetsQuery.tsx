import type { ChainId } from '@shapeshiftoss/caip'
import {
  celoAssetId,
  celoChainId,
  hyperEvmAssetId,
  katanaAssetId,
  lineaAssetId,
  lineaChainId,
  mayachainAssetId,
  monadAssetId,
  nearAssetId,
  plasmaAssetId,
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
import {
  selectAssets,
  selectAssetsSortedByMarketCap,
  selectPrimaryAssets,
  selectPrimaryAssetsSortedByMarketCap,
} from '@/state/slices/selectors'
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
  if (enabledFlags.Katana) assetIds.push(katanaAssetId)
  if (enabledFlags.Starknet) assetIds.push(starknetAssetId)
  if (enabledFlags.Tron) assetIds.push(tronAssetId)
  if (enabledFlags.Sui) assetIds.push(suiAssetId)

  // add generic EVM chains to popular assets for discoverability
  assetIds.push(celoAssetId)
  assetIds.push(lineaAssetId)

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

  const MIN_POPULAR_ASSETS_PER_CHAIN = 50
  const primaryAssetsSortedByMarketCap = selectPrimaryAssetsSortedByMarketCap(store.getState())
  const assetsSortedByMarketCap = selectAssetsSortedByMarketCap(store.getState())

  const genericEvmChainIds: ChainId[] = [lineaChainId, celoChainId]

  for (const chainId of genericEvmChainIds) {
    if (!result[chainId]) result[chainId] = []
  }

  Object.keys(result).forEach(chainId => {
    if (chainId === 'All') return
    if (result[chainId].length >= MIN_POPULAR_ASSETS_PER_CHAIN) return

    const isGenericEvmChain = genericEvmChainIds.includes(chainId as ChainId)
    const sourceAssets = isGenericEvmChain
      ? assetsSortedByMarketCap
      : primaryAssetsSortedByMarketCap
    const chainAssets = sourceAssets.filter(asset => asset.chainId === chainId)
    const existingAssetIds = new Set(result[chainId].map(a => a.assetId))

    for (const asset of chainAssets) {
      if (result[chainId].length >= MIN_POPULAR_ASSETS_PER_CHAIN) break
      if (!existingAssetIds.has(asset.assetId)) {
        result[chainId].push(asset)
      }
    }
  })

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
