import type { AssetId } from '@shapeshiftoss/caip'
import { adapters, toAssetId } from '@shapeshiftoss/caip'
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
  const assetNamespace = getAssetNamespaceFromChainId(chainId as KnownChainIds)
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
  const assetNamespace = getAssetNamespaceFromChainId(chainId as KnownChainIds)
  return toAssetId({ chainId, assetNamespace, assetReference: contractAddress })
}
