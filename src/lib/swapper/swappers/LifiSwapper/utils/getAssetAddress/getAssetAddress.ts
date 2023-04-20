import type { Asset } from '@shapeshiftoss/asset-service'
import { fromAssetId, isAssetReference } from '@shapeshiftoss/caip'
import { isNativeEvmAsset } from 'lib/swapper/swappers/utils/helpers/helpers'

import { DEFAULT_LIFI_TOKEN_ADDRESS } from '../constants'

export const getEvmAssetAddress = (asset: Asset): string => {
  if (isNativeEvmAsset(asset.assetId)) return DEFAULT_LIFI_TOKEN_ADDRESS
  const { assetReference } = fromAssetId(asset.assetId)
  return isAssetReference(assetReference) ? DEFAULT_LIFI_TOKEN_ADDRESS : assetReference
}
