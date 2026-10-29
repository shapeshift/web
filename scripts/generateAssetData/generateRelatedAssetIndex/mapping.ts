import type { AssetId } from '@shapeshiftoss/caip'
import { adapters, aptosChainId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds, ZerionChainId } from '@shapeshiftoss/types'
import { zerionChainIdToChainId } from '@shapeshiftoss/types'
import { getAssetNamespaceFromChainId } from '@shapeshiftoss/utils'

import type { ZerionImplementation } from './validators/fungible'

export const zerionImplementationToMaybeAssetId = (
  implementation: ZerionImplementation,
): AssetId | undefined => {
  const { chain_id, address: assetReference } = implementation
  const chainId = zerionChainIdToChainId(chain_id as ZerionChainId)
  if (!chainId || !assetReference) return undefined
  const assetNamespace = getAssetNamespaceFromChainId(chainId as KnownChainIds, assetReference)
  return toAssetId({ chainId, assetNamespace, assetReference })
}

export const coingeckoPlatformDetailsToMaybeAssetId = (
  platformDetails: [string, string],
): AssetId | undefined => {
  const [platform, contractAddress] = platformDetails
  const chainId = adapters.coingeckoAssetPlatformToChainId(
    platform as adapters.CoingeckoAssetPlatform,
  )
  if (!chainId || !contractAddress) return undefined
  const assetNamespace = getAssetNamespaceFromChainId(chainId as KnownChainIds, contractAddress)
  return toAssetId({ chainId, assetNamespace, assetReference: contractAddress })
}

// aptos paired fungible assets are re-keyed to their coin type, which only the caip adapter knows
export const coingeckoIdToAptosAssetIds = (coingeckoId: string): AssetId[] =>
  (adapters.coingeckoToAssetIds(coingeckoId) ?? []).filter(
    assetId => fromAssetId(assetId).chainId === aptosChainId,
  )
