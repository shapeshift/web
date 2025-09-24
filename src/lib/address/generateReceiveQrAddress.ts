import { CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { isToken } from '@shapeshiftoss/utils'

import { toBaseUnit } from '@/lib/math'

export type GenerateReceiveQrAddressArgs = {
  receiveAddress: string
  asset: Asset
  amountCryptoPrecision?: string
}

/**
 * Generates a receive QR code address string following EIP-681 for EVM chains and BIP-21 for UTXOs
 *
 * For EVM chains (Phase 1): ethereum:{address}@{chainId}
 * For EVM chains with amount (Phase 2): ethereum:{address}@{chainId}?value={amountInWei}
 * For EVM chains with ERC-20 amount (Phase 2): ethereum:{tokenContract}@{chainId}/transfer?address={userAddress}&uint256={tokenAmount}
 * For UTXO chains: {address} (unchanged from current behavior)
 */
export const generateReceiveQrAddress = ({
  receiveAddress,
  asset,
  amountCryptoPrecision,
}: GenerateReceiveQrAddressArgs): string => {
  const { chainId, assetId } = asset
  const { chainNamespace } = fromChainId(chainId)

  // For UTXO chains, keep current behavior (just the address)
  if (chainNamespace !== CHAIN_NAMESPACE.Evm) {
    return receiveAddress
  }

  // For EVM chains, generate EIP-681 format
  const numericChainId = Number(fromChainId(chainId).chainReference)
  const isTokenAsset = isToken(assetId)

  // Basic address format: ethereum:{address}@{chainId}
  if (!amountCryptoPrecision) {
    return `ethereum:${receiveAddress}@${numericChainId}`
  }

  // With amount - handle native vs token differently
  if (isTokenAsset) {
    // ERC-20 token transfer: ethereum:{tokenContract}@{chainId}/transfer?address={userAddress}&uint256={tokenAmount}
    const { assetReference: tokenContract } = fromAssetId(assetId)
    const amountBaseUnit = toBaseUnit(amountCryptoPrecision, asset.precision)
    return `ethereum:${tokenContract}@${numericChainId}/transfer?address=${receiveAddress}&uint256=${amountBaseUnit}`
  } else {
    // Native token: ethereum:{address}@{chainId}?value={amountInWei}
    const amountBaseUnit = toBaseUnit(amountCryptoPrecision, asset.precision)
    return `ethereum:${receiveAddress}@${numericChainId}?value=${amountBaseUnit}`
  }
}
