import { type ChainId, type AssetId } from '@shapeshiftoss/caip'

import type { ChainflipSupportedChainId } from '../constants'
import { ChainflipSupportedChainIds, ChainflipSupportedAssetIdsByChainId } from "../constants";

export const isSupportedChainId = (chainId: ChainId): chainId is ChainflipSupportedChainId => {
  return ChainflipSupportedChainIds.includes(chainId as ChainflipSupportedChainId)
}

export const isSupportedAssetId = (chainId: ChainId, assetId: AssetId): chainId is ChainflipSupportedChainId => {
  return ChainflipSupportedAssetIdsByChainId[chainId as ChainflipSupportedChainId]!.includes(assetId)
}
