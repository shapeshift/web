import {
  btcAssetId,
  fromAssetId,
  isAssetReference,
  solAssetId,
  tronAssetId,
} from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { Address } from 'viem'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import {
  DEFAULT_RELAY_EVM_TOKEN_ADDRESS,
  RELAY_BTC_TOKEN_ADDRESS,
  RELAY_SOLANA_TOKEN_ADDRESS,
  RELAY_TRON_TOKEN_ADDRESS,
} from '../constant'

export const getRelayAssetAddress = (asset: Asset): Address => {
  if (asset.assetId === btcAssetId) return RELAY_BTC_TOKEN_ADDRESS as Address
  if (asset.assetId === solAssetId) return RELAY_SOLANA_TOKEN_ADDRESS as Address
  if (asset.assetId === tronAssetId) return RELAY_TRON_TOKEN_ADDRESS as Address
  if (isNativeEvmAsset(asset.assetId)) return DEFAULT_RELAY_EVM_TOKEN_ADDRESS
  const { assetReference } = fromAssetId(asset.assetId)

  return isAssetReference(assetReference)
    ? DEFAULT_RELAY_EVM_TOKEN_ADDRESS
    : (assetReference as Address)
}
