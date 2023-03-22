import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, toAssetId } from '@shapeshiftoss/caip'

import { ZERION_CHAINS_MAP, ZERION_FEE_ASSETS_MAP } from './mapping'
import type { ZerionChainId, ZerionFeeAssetId } from './types'

export const zerionChainIdToChainId = (zerionChainId: ZerionChainId): ChainId | undefined =>
  ZERION_CHAINS_MAP[zerionChainId]

export const zerionAssetIdToAssetId = (zerionAssetId: string): AssetId | undefined => {
  if (zerionAssetId.startsWith('0x')) {
    // e.g. 0x1f9840a85d5af5bf1d1762f925bdaddc4201f984-ethereum-asset
    const parts = zerionAssetId.split('-')
    const [assetReference, zerionChainId] = parts
    // zerion only supports "fungibles", i.e. no NFTs
    const chainId = zerionChainIdToChainId(zerionChainId as ZerionChainId)
    if (!chainId) return
    const assetNamespace = ASSET_NAMESPACE.erc20
    const assetId = toAssetId({ chainId, assetNamespace, assetReference })
    return assetId
  } else {
    // fee assets
    return ZERION_FEE_ASSETS_MAP[zerionAssetId as ZerionFeeAssetId]
  }
}
