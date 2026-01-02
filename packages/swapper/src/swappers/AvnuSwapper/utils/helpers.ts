import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

// STRK native token contract address on Starknet
const AVNU_STRK_NATIVE_ADDRESS =
  '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'

/**
 * Get the token address for AVNU swaps
 * For native STRK token (slip44 namespace), returns the STRK contract address
 * For other tokens, returns the token contract address from assetReference
 */
export const getTokenAddress = (asset: Asset): string => {
  const { assetReference, assetNamespace } = fromAssetId(asset.assetId)

  // For native STRK token, the assetReference is 'slip44:9004' but AVNU expects the STRK contract address
  if (assetNamespace === 'slip44') {
    return AVNU_STRK_NATIVE_ADDRESS
  }

  // For other tokens, the assetReference should be the token contract address
  return assetReference
}
