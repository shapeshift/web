import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, tronChainId } from '@shapeshiftoss/caip'
import { isToken } from '@shapeshiftoss/utils'

import { SUNIO_SUPPORTED_CHAIN_IDS, SUNIO_TRON_NATIVE_ADDRESS } from '../constants'

export const isSupportedChainId = (chainId: string): boolean => {
  return SUNIO_SUPPORTED_CHAIN_IDS.includes(chainId as any)
}

export const assetIdToTronToken = (assetId: AssetId): string => {
  if (isToken(assetId)) {
    const { assetReference } = fromAssetId(assetId)
    return assetReference
  }
  return SUNIO_TRON_NATIVE_ADDRESS
}

export const isTronChainId = (chainId: string): chainId is typeof tronChainId => {
  return chainId === tronChainId
}
