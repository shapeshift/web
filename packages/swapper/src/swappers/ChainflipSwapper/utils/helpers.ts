import { type AssetId, type ChainId } from '@shapeshiftoss/caip'

import type { ChainflipSupportedChainId } from '../constants'
import { ChainflipSupportedAssetIdsByChainId, ChainflipSupportedChainIds } from '../constants'

export const isSupportedChainId = (chainId: ChainId): chainId is ChainflipSupportedChainId => {
  return ChainflipSupportedChainIds.includes(chainId as ChainflipSupportedChainId)
}

export const isSupportedAssetId = (
  chainId: ChainId,
  assetId: AssetId,
): chainId is ChainflipSupportedChainId => {
  return ChainflipSupportedAssetIdsByChainId[chainId as ChainflipSupportedChainId]!.includes(
    assetId,
  )
}
