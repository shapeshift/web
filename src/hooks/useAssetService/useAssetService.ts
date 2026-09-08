import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId, starknetChainId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'

import { SECOND_CLASS_CHAINS } from '@/constants/chains'
import { getAssetService, initAssetService } from '@/lib/asset-service'
import { assets } from '@/state/slices/assetsSlice/assetsSlice'
import { useAppDispatch } from '@/state/store'

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

// Safe to call from anywhere - react-query dedupes on the key, so this initializes and upserts once
export const useAssetService = () => {
  const dispatch = useAppDispatch()

  return useQuery({
    queryKey: ASSET_SERVICE_QUERY_KEY,
    queryFn: async () => {
      await initAssetService()
      const service = getAssetService()

      dispatch(
        assets.actions.upsertAssets({
          byId: service.assetsById,
          ids: service.assetIds,
        }),
      )
      dispatch(assets.actions.setRelatedAssetIndex(service.relatedAssetIndex))

      return true
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
