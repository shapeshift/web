import type { AssetId, ChainId } from '@shapeshiftmonorepo/caip'
import type { Asset } from '@shapeshiftmonorepo/types'

import { chainIdToFeeAssetId } from './chainIdToFeeAssetId'

export const chainIdToFeeAsset = (
  assetsById: Partial<Record<AssetId, Asset>>,
  chainId: ChainId,
): Asset | undefined => {
  const assetId = chainIdToFeeAssetId(chainId)
  return assetsById[assetId]
}
