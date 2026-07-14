import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { tron } from '@shapeshiftoss/chain-adapters'
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
  return tron.TRON_ZERO_ADDRESS
}
