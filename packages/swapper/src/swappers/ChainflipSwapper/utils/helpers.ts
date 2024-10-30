import { type AssetId, type ChainId } from '@shapeshiftoss/caip'

import type { ChainflipSupportedChainId } from '../constants'
import {
  assetGasLimits,
  ChainflipSupportedAssetIdsByChainId,
  ChainflipSupportedChainIds,
} from '../constants'

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

export const getGasLimit = (chainflipAsset: string) => {
  return chainflipAsset in assetGasLimits ? assetGasLimits[chainflipAsset]! : '100000'
}
