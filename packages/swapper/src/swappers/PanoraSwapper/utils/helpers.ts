import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import { PANORA_NATIVE_TOKEN_ADDRESS } from './constants'

export const getTokenAddress = (asset: Asset): string => {
  const { assetNamespace, assetReference } = fromAssetId(asset.assetId)

  // For native APT (slip44 namespace), return the Panora native token address
  if (assetNamespace === 'slip44') {
    return PANORA_NATIVE_TOKEN_ADDRESS
  }

  // For tokens, the assetReference is the Aptos token address
  return assetReference
}

export const aptosAddressFromAssetId = (assetId: string): string => {
  const { assetReference, assetNamespace } = fromAssetId(assetId)

  if (assetNamespace === 'slip44') {
    return PANORA_NATIVE_TOKEN_ADDRESS
  }

  return assetReference
}
