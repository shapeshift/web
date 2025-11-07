import { fromAssetId, solanaChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { isToken } from '@shapeshiftoss/utils'

import { DEFAULT_SLIPPAGE_BPS } from '../../constants'
import type { GetExecutionStatusResponse } from '../../types'
import {
  chainIdToNearIntentsChain,
  getNearIntentsAsset,
  NEAR_INTENTS_NATIVE_EVM_MARKER,
} from '../../types'
import { OneClickService } from '../oneClickService'

export const convertSlippageToBps = (slippageDecimal: string | undefined): number => {
  if (!slippageDecimal) return DEFAULT_SLIPPAGE_BPS
  return Math.round(Number(slippageDecimal) * 10000)
}

export const assetToNearIntentsAsset = async (asset: Asset): Promise<string> => {
  const nearIntentsChain =
    chainIdToNearIntentsChain[asset.chainId as keyof typeof chainIdToNearIntentsChain]

  if (!nearIntentsChain) {
    throw new Error(`Unsupported chain for NEAR Intents: ${asset.chainId}`)
  }

  // Solana tokens need lookup from /v0/tokens (can't be generated)
  if (asset.chainId === solanaChainId && isToken(asset.assetId)) {
    const tokens = await OneClickService.getTokens()
    const solanaAddress = fromAssetId(asset.assetId).assetReference
    const match = tokens.find(t => t.blockchain === 'sol' && t.contractAddress === solanaAddress)

    if (!match) {
      throw new Error(`Solana token not found in NEAR Intents: ${solanaAddress}`)
    }

    return match.assetId
  }

  // For EVM, Bitcoin, Doge, and native assets - use predictable format
  const contractAddress = isToken(asset.assetId)
    ? fromAssetId(asset.assetId).assetReference
    : NEAR_INTENTS_NATIVE_EVM_MARKER

  return getNearIntentsAsset(nearIntentsChain, contractAddress)
}

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
      return undefined
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
