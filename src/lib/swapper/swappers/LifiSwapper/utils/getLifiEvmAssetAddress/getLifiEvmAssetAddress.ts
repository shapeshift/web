import { fromAssetId, isAssetReference } from '@shapeshiftoss/caip'
import type { Address } from 'viem'
import type { Asset } from 'lib/asset-service'
import { isNativeEvmAsset } from 'lib/swapper/swappers/utils/helpers/helpers'

import { DEFAULT_LIFI_TOKEN_ADDRESS } from '../constants'

export const getLifiEvmAssetAddress = (asset: Asset): Address => {
  if (isNativeEvmAsset(asset.assetId)) return DEFAULT_LIFI_TOKEN_ADDRESS
  const { assetReference } = fromAssetId(asset.assetId)
  return isAssetReference(assetReference) ? DEFAULT_LIFI_TOKEN_ADDRESS : (assetReference as Address)
}
