import { fromAssetId, isAssetReference } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { Address } from 'viem'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { DEFAULT_RELAY_EVM_TOKEN_ADDRESS } from '../constant'

export const getRelayEvmAssetAddress = (asset: Asset): Address => {
  if (isNativeEvmAsset(asset.assetId)) return DEFAULT_RELAY_EVM_TOKEN_ADDRESS
  const { assetReference } = fromAssetId(asset.assetId)
  return isAssetReference(assetReference)
    ? DEFAULT_RELAY_EVM_TOKEN_ADDRESS
    : (assetReference as Address)
}
