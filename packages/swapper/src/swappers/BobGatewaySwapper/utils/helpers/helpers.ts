import type { GatewayOrderStatus } from '@gobob/bob-sdk'
import { fromAssetId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { isToken } from '@shapeshiftoss/utils'

import type { SwapErrorRight } from '../../../../types'
import { TradeQuoteError } from '../../../../types'
import { makeSwapErrorRight } from '../../../../utils'
import type { BobGatewayChainName } from '../constants'
import {
  BOB_GATEWAY_SUPPORTED_CHAIN_IDS,
  BTC_TOKEN_ADDRESS,
  CHAIN_ID_TO_BOB_GATEWAY_CHAIN_NAME,
} from '../constants'

export const isSupportedChainId = (
  chainId: string,
): chainId is (typeof BOB_GATEWAY_SUPPORTED_CHAIN_IDS)[number] => {
  return (BOB_GATEWAY_SUPPORTED_CHAIN_IDS as readonly string[]).includes(chainId)
}

export const chainIdToBobGatewayChainName = (chainId: string): BobGatewayChainName | undefined => {
  return CHAIN_ID_TO_BOB_GATEWAY_CHAIN_NAME[chainId]
}

/**
 * Converts a ShapeShift AssetId to the token address format expected by the BOB Gateway API.
 * Native BTC maps to the zero address (0x000...000).
 * ERC-20s on BOB chain map to their contract address.
 */
export const assetIdToBobGatewayToken = (assetId: string): string => {
  if (!isToken(assetId)) {
    // Native asset (BTC, or native BOB ETH-equivalent)
    return BTC_TOKEN_ADDRESS
  }
  const { assetReference } = fromAssetId(assetId)
  return assetReference
}

/**
 * Maps a BOB Gateway order status to a ShapeShift TxStatus.
 * GatewayOrderStatus is a discriminated union of:
 *   - 'success' | 'refunded' (string literals)
 *   - GatewayOrderStatusOneOf (inProgress object)
 *   - GatewayOrderStatusOneOf1 (failed object)
 */
export const mapBobGatewayOrderStatusToTxStatus = (status: GatewayOrderStatus): TxStatus => {
  if (status === 'success') return TxStatus.Confirmed
  if (status === 'refunded') return TxStatus.Failed

  // inProgress: { inProgress: { ... } }
  if (typeof status === 'object' && status !== null && 'inProgress' in status) {
    return TxStatus.Pending
  }

  // failed: { failed: { ... } }
  if (typeof status === 'object' && status !== null && 'failed' in status) {
    return TxStatus.Failed
  }

  return TxStatus.Unknown
}

/**
 * Validates that a BTC ↔ BOB route is supported.
 * For PR 1, supported routes are:
 *   - BTC (bitcoin) → BOB chain token  (btcToEvm)
 *   - BOB chain token → BTC (bitcoin)  (evmToBtc)
 * Cross-chain LayerZero routes (SS-5639) are not included here.
 */
export const validateBobGatewayRoute = (
  sellChainId: string,
  buyChainId: string,
): SwapErrorRight | null => {
  const sellChainName = chainIdToBobGatewayChainName(sellChainId)
  const buyChainName = chainIdToBobGatewayChainName(buyChainId)

  if (!sellChainName) {
    return makeSwapErrorRight({
      message: `[BobGateway] unsupported sell chain: ${sellChainId}`,
      code: TradeQuoteError.UnsupportedChain,
      details: { chainId: sellChainId },
    })
  }

  if (!buyChainName) {
    return makeSwapErrorRight({
      message: `[BobGateway] unsupported buy chain: ${buyChainId}`,
      code: TradeQuoteError.UnsupportedChain,
      details: { chainId: buyChainId },
    })
  }

  // Must be cross-chain: bitcoin↔bob (not same-chain swaps)
  if (sellChainName === buyChainName) {
    return makeSwapErrorRight({
      message: `[BobGateway] same-chain swaps not supported`,
      code: TradeQuoteError.CrossChainNotSupported,
    })
  }

  return null
}
