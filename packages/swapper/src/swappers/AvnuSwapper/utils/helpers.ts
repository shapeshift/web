import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { num } from 'starknet'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { AVNU_SUPPORTED_CHAIN_IDS } from './constants'

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

export const assertValidTrade = ({
  sellAsset,
  buyAsset,
}: {
  sellAsset: Asset
  buyAsset: Asset
}): Result<void, SwapErrorRight> => {
  if (!AVNU_SUPPORTED_CHAIN_IDS.includes(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `Chain ${sellAsset.chainId} is not supported by AVNU`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  if (!AVNU_SUPPORTED_CHAIN_IDS.includes(buyAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `Chain ${buyAsset.chainId} is not supported by AVNU`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  return Ok(undefined)
}

/**
 * Normalize a value to hex format for Starknet RPC
 * Handles various input types: decimal strings, hex strings (with/without 0x), numbers, BigInts
 */
export const toHexString = (value: unknown): string => {
  const strValue = String(value)

  // Already a proper hex string with 0x prefix
  if (strValue.startsWith('0x')) {
    return strValue
  }

  // Check if it looks like a hex string without 0x prefix (contains a-f characters)
  // Starknet addresses and felts often come as hex without 0x prefix
  if (/^[0-9a-fA-F]+$/.test(strValue) && /[a-fA-F]/.test(strValue)) {
    return `0x${strValue}`
  }

  // Otherwise treat as decimal and convert to hex
  try {
    return num.toHex(strValue)
  } catch {
    // If conversion fails, assume it's already hex and add prefix
    return `0x${strValue}`
  }
}
