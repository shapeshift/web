import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, tronChainId } from '@shapeshiftoss/caip'
import { isToken } from '@shapeshiftoss/utils'

import { SUNIO_SUPPORTED_CHAIN_IDS } from '../constants'

export const isSupportedChainId = (chainId: string): boolean => {
  return SUNIO_SUPPORTED_CHAIN_IDS.includes(chainId as any)
}

export const assetIdToTronToken = (assetId: AssetId): string => {
  if (isToken(assetId)) {
    const { assetReference } = fromAssetId(assetId)
    return assetReference
  }
  return 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb'
}

export const isTronChainId = (chainId: string): chainId is typeof tronChainId => {
  return chainId === tronChainId
}
