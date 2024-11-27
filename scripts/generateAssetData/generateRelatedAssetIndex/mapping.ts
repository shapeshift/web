import type { AssetId } from '@shapeshiftoss/caip'
import {
  adapters,
  ASSET_NAMESPACE,
  bscChainId,
  solanaChainId,
  toAssetId,
} from '@shapeshiftoss/caip'
import type { ZerionChainId } from '@shapeshiftoss/types'
import { zerionChainIdToChainId } from '@shapeshiftoss/types'

import type { ZerionImplementation } from './validators/fungible'

export const zerionImplementationToMaybeAssetId = (
  implementation: ZerionImplementation,
): AssetId | undefined => {
  const { chain_id, address: assetReference } = implementation
  const chainId = zerionChainIdToChainId(chain_id as ZerionChainId)
  if (!chainId || !assetReference) return undefined
  const assetNamespace = (() => {
    switch (true) {
      case chainId === bscChainId:
        return ASSET_NAMESPACE.bep20
      default:
        return ASSET_NAMESPACE.erc20
    }
  })()
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
  const assetNamespace = (() => {
    switch (true) {
      case chainId === bscChainId:
        return ASSET_NAMESPACE.bep20
      case chainId === solanaChainId:
        return ASSET_NAMESPACE.splToken
      default:
        return ASSET_NAMESPACE.erc20
    }
  })()
  return toAssetId({ chainId, assetNamespace, assetReference: contractAddress })
}
