import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import { isNativeEvmAsset } from '../../../utils/helpers/helpers'
import { DEFAULT_SLIPPAGE_BPS } from '../../constants'
import type { GetExecutionStatusResponse } from '../../types'
import {
  chainIdToNearIntentsChain,
  getNearIntentsAsset,
  NEAR_INTENTS_NATIVE_EVM_MARKER,
} from '../../types'

export const convertSlippageToBps = (slippageDecimal: string | undefined): number => {
  if (!slippageDecimal) return DEFAULT_SLIPPAGE_BPS
  return Math.round(Number(slippageDecimal) * 10000)
}

/**
 * Convert ShapeShift Asset to NEAR Intents asset ID format
 * Format: "blockchain.contractAddress"
 * Example: "eth.0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" for USDC on Ethereum
 *
 * @param asset - ShapeShift Asset object
 * @returns NEAR Intents asset ID string
 */
export const assetToNearIntentsId = (asset: Asset): string => {
  const chainId = asset.chainId
  const blockchain = chainIdToNearIntentsChain[chainId as keyof typeof chainIdToNearIntentsChain]

  if (!blockchain) {
    throw new Error(`Unsupported chain for NEAR Intents: ${chainId}`)
  }

  // For native assets (ETH, MATIC, BNB, etc.), use zero address
  const contractAddress = isNativeEvmAsset(asset.assetId)
    ? NEAR_INTENTS_NATIVE_EVM_MARKER
    : fromAssetId(asset.assetId).assetReference

  return getNearIntentsAssetId(blockchain, contractAddress)
}

/**
 * Map 1Click swap status to ShapeShift TxStatus
 */
export const mapNearIntentsStatus = (status: GetExecutionStatusResponse['status']): TxStatus => {
  switch (status) {
    case 'PENDING_DEPOSIT':
    case 'KNOWN_DEPOSIT_TX':
    case 'PROCESSING':
      return TxStatus.Pending
    case 'SUCCESS':
      return TxStatus.Confirmed
    case 'INCOMPLETE_DEPOSIT':
    case 'REFUNDED':
    case 'FAILED':
      return TxStatus.Failed
    default:
      return TxStatus.Unknown
  }
}

export const getNearIntentsStatusMessage = (
  status: GetExecutionStatusResponse['status'],
): string | undefined => {
  switch (status) {
    case 'PENDING_DEPOSIT':
      return 'Waiting for deposit...'
    case 'KNOWN_DEPOSIT_TX':
      return 'Deposit detected, waiting for confirmation...'
    case 'PROCESSING':
      return 'Processing swap...'
    case 'SUCCESS':
      return undefined // No message needed for success
    case 'INCOMPLETE_DEPOSIT':
      return 'Insufficient deposit amount'
    case 'REFUNDED':
      return 'Swap failed, funds refunded'
    case 'FAILED':
      return 'Swap failed'
    default:
      return 'Unknown status'
  }
}
