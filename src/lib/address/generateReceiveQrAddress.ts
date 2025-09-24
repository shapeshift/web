import { CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { isToken } from '@shapeshiftoss/utils'

import { CHAIN_ID_TO_URN_SCHEME } from './constants'

import { toBaseUnit } from '@/lib/math'

export type GenerateReceiveQrAddressArgs = {
  receiveAddress: string
  asset: Asset
  amountCryptoPrecision?: string
}

/**
 * Generates a receive QR code address string following different standards per chain type:
 *
 * For EVM chains (Phase 1): ethereum:{address}@{chainId}
 * For EVM chains with amount (Phase 2): ethereum:{address}@{chainId}?value={amountInWei}
 * For EVM chains with ERC-20 amount (Phase 2): ethereum:{tokenContract}@{chainId}/transfer?address={userAddress}&uint256={tokenAmount}
 * For UTXO chains (Phase 1): {address}
 * For UTXO chains with amount (Phase 2): {scheme}:{address}?amount={amountInCrypto}
 * For Cosmos chains (Phase 3): {scheme}:{address}?amount={amountInCrypto} (BIP-21 format)
 * For Solana (Phase 3): solana:{address}?amount={amountInSOL} (Solana Pay format)
 */
export const generateReceiveQrAddress = ({
  receiveAddress,
  asset,
  amountCryptoPrecision,
}: GenerateReceiveQrAddressArgs): string => {
  if (!receiveAddress) {
    return ''
  }

  const { chainId, assetId } = asset
  const { chainNamespace } = fromChainId(chainId)

  // Handle UTXO chains with BIP-21 format
  if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
    // Basic address format: just the address
    if (!amountCryptoPrecision) {
      return receiveAddress
    }

    // With amount: {scheme}:{address}?amount={amountInCrypto}
    const scheme = CHAIN_ID_TO_URN_SCHEME[chainId]
    if (scheme) {
      // Handle bitcoincash: prefix specifically to avoid double-prefixing
      const cleanAddress = receiveAddress.replace('bitcoincash:', '')
      return `${scheme}:${cleanAddress}?amount=${amountCryptoPrecision}`
    }

    // Fallback to plain address if scheme not found
    return receiveAddress
  }

  // Handle Cosmos chains with BIP-21 format
  if (chainNamespace === CHAIN_NAMESPACE.CosmosSdk) {
    // Basic address format: just the address
    if (!amountCryptoPrecision) {
      return receiveAddress
    }

    // With amount: {scheme}:{address}?amount={amountInCrypto}
    const scheme = CHAIN_ID_TO_URN_SCHEME[chainId]
    if (scheme) {
      return `${scheme}:${receiveAddress}?amount=${amountCryptoPrecision}`
    }

    // Fallback to plain address if scheme not found
    return receiveAddress
  }

  // Handle Solana with Solana Pay format
  if (chainNamespace === CHAIN_NAMESPACE.Solana) {
    const isTokenAsset = isToken(assetId)

    // Basic address format: just the address (both SOL and SPL tokens)
    if (!amountCryptoPrecision) {
      return receiveAddress
    }

    if (isTokenAsset) {
      // SPL token transfer: solana:{recipient}?amount={tokenAmount}&spl-token={tokenMint}
      const { assetReference: tokenMint } = fromAssetId(assetId)
      return `solana:${receiveAddress}?amount=${amountCryptoPrecision}&spl-token=${tokenMint}`
    }

    // Native SOL: solana:{address}?amount={amountInSOL}
    return `solana:${receiveAddress}?amount=${amountCryptoPrecision}`
  }

  // Handle non-EVM, non-UTXO, non-Cosmos, non-Solana chains (fallback to plain address)
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
  }

  // Native token: ethereum:{address}@{chainId}?value={amountInWei}
  const amountBaseUnit = toBaseUnit(amountCryptoPrecision, asset.precision)
  return `ethereum:${receiveAddress}@${numericChainId}?value=${amountBaseUnit}`
}
