import { ASSOCIATED_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token'
import { fromAssetId, solanaChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { bnOrZero, isToken } from '@shapeshiftoss/utils'
import type { TransactionInstruction } from '@solana/web3.js'
import { zeroAddress } from 'viem'

import type { GetExecutionStatusResponse, TokenResponse } from '../../types'
import { chainIdToNearIntentsChain } from '../../types'
import { OneClickService } from '../oneClickService'

const ATA_RENT_LAMPORTS = 2040000

export const calculateAccountCreationCosts = (instructions: TransactionInstruction[]): string => {
  let totalCost = bnOrZero(0)

  for (const ix of instructions) {
    if (ix.programId.toString() === ASSOCIATED_PROGRAM_ID.toString()) {
      totalCost = totalCost.plus(ATA_RENT_LAMPORTS)
    }
  }

  return totalCost.toString()
}

export const getNearIntentsAsset = ({
  nearNetwork,
  contractAddress,
}: {
  nearNetwork: string
  contractAddress: string
}): string => {
  // Native EVM assets: "nep141:eth.omft.near"
  if (contractAddress === zeroAddress) {
    return `nep141:${nearNetwork}.omft.near`
  }
  // ERC20 tokens: "nep141:eth-0x{address}.omft.near"
  return `nep141:${nearNetwork}-${contractAddress.toLowerCase()}.omft.near`
}

const NEP245_CHAINS = ['bsc', 'pol', 'avax', 'op', 'tron'] as const

export const assetToNearIntentsAsset = async (asset: Asset): Promise<string | null> => {
  const nearNetwork =
    chainIdToNearIntentsChain[asset.chainId as keyof typeof chainIdToNearIntentsChain]

  if (!nearNetwork) return null

  // NEP-245 chains (BSC, Polygon, Avalanche, Optimism, TRON) and Solana require token lookup
  // Asset IDs use hashed format that can't be generated from contract addresses
  const requiresLookup =
    NEP245_CHAINS.includes(nearNetwork as any) || asset.chainId === solanaChainId

  if (requiresLookup) {
    const tokens = await OneClickService.getTokens()

    const { assetNamespace, assetReference } = fromAssetId(asset.assetId)
    const isNativeAsset = assetNamespace === 'slip44'
    const contractAddress = !isNativeAsset ? assetReference.toLowerCase() : null

    const match = tokens.find((t: TokenResponse) => {
      if (t.blockchain !== nearNetwork) return false
      return contractAddress
        ? t.contractAddress?.toLowerCase() === contractAddress
        : !t.contractAddress
    })

    if (!match) {
      return null
    }

    return match.assetId
  }

  // NEP-141 chains (ETH, ARB, BASE, GNOSIS, BTC, DOGE): use predictable format
  const contractAddress = isToken(asset.assetId)
    ? fromAssetId(asset.assetId).assetReference
    : zeroAddress

  return getNearIntentsAsset({ nearNetwork, contractAddress })
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
