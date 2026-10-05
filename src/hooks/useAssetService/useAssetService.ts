import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId, starknetChainId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'

import { SECOND_CLASS_CHAINS } from '@/constants/chains'
import type { GetLoadedAssets } from '@/lib/asset-service'
import { getAssetService, initAssetService } from '@/lib/asset-service'
import { assets } from '@/state/slices/assetsSlice/assetsSlice'
import { store, useAppDispatch } from '@/state/store'

const ASSET_SERVICE_QUERY_KEY = ['assetService']

// Chains that scan known tokens rather than discovering them. Listed by chain id so this doesn't
// depend on plugin registration; the non-EVM second class chains enumerate on chain, so are excluded.
const KNOWN_TOKEN_SCANNING_CHAIN_IDS: Set<ChainId> = new Set([
  starknetChainId,
  ...SECOND_CLASS_CHAINS.filter(
    chainId => fromChainId(chainId).chainNamespace === CHAIN_NAMESPACE.Evm,
  ),
])

export const chainScansKnownTokens = (chainId: ChainId): boolean =>
  KNOWN_TOKEN_SCANNING_CHAIN_IDS.has(chainId)

// The generated assets the store already holds for the given version, without the runtime assets
const getLoadedAssets: GetLoadedAssets = version => {
  const {
    byId,
    ids,
    relatedAssetIndex,
    runtimeAssetIds,
    version: loadedVersion,
  } = store.getState().assets
  if (loadedVersion !== version) return

  const runtimeAssetIdSet = new Set(runtimeAssetIds)
  const assetIds = ids.filter(assetId => !runtimeAssetIdSet.has(assetId))

  return {
    assetsById: Object.fromEntries(assetIds.map(assetId => [assetId, byId[assetId]])),
    assetIds,
    relatedAssetIndex,
  } as ReturnType<GetLoadedAssets>
}

// Safe to call from anywhere - react-query dedupes on the key, so this initializes and loads once
export const useAssetService = () => {
  const dispatch = useAppDispatch()

  return useQuery({
    queryKey: ASSET_SERVICE_QUERY_KEY,
    queryFn: async () => {
      await initAssetService(getLoadedAssets)
      const service = getAssetService()

      // The store already holds the assets for this build and asset data, and the service was loaded from them
      if (service.version && service.version === assets.selectors.selectVersion(store.getState()))
        return true

      dispatch(
        assets.actions.setGeneratedAssets({
          byId: service.assetsById,
          ids: service.assetIds,
          relatedAssetIndex: service.relatedAssetIndex,
          version: service.version,
        }),
      )

      return true
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
