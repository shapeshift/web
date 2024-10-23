import { type ChainId } from '@shapeshiftoss/caip'

import type { ChainflipSupportedChainId } from '../types'
import { ChainflipSupportedChainIds, ChainflipSupportedAssets } from '../types'

export const isSupportedChainId = (chainId: ChainId): chainId is ChainflipSupportedChainId => {
  return ChainflipSupportedChainIds.includes(chainId as ChainflipSupportedChainId)
}

export const isSupportedAsset = (chainId: ChainId, symbol: string): chainId is ChainflipSupportedChainId => {
  return ChainflipSupportedAssets[chainId as ChainflipSupportedChainId].includes(symbol.toLowerCase())
}