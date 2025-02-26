import { fromAssetId, isAssetReference } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { Address } from 'viem'

import { isNativeEvmAsset } from '../../../utils/helpers/helpers'
import { DEFAULT_LIFI_TOKEN_ADDRESS } from '../constants'

export const getLifiEvmAssetAddress = (asset: Asset): Address => {
  if (isNativeEvmAsset(asset.assetId)) return DEFAULT_LIFI_TOKEN_ADDRESS
  const { assetReference } = fromAssetId(asset.assetId)
  return isAssetReference(assetReference) ? DEFAULT_LIFI_TOKEN_ADDRESS : (assetReference as Address)
}
