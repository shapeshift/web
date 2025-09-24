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

export const generateReceiveQrAddress = ({
  receiveAddress,
  asset,
  amountCryptoPrecision,
}: GenerateReceiveQrAddressArgs): string => {
  const { chainId, assetId } = asset
  const { chainNamespace } = fromChainId(chainId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Utxo: {
      if (!amountCryptoPrecision) {
        return receiveAddress
      }

      const scheme = CHAIN_ID_TO_URN_SCHEME[chainId]
      if (scheme) {
        // Handle bitcoincash: prefix specifically to avoid double-prefixing
        const cleanAddress = receiveAddress.replace('bitcoincash:', '')
        return `${scheme}:${cleanAddress}?amount=${amountCryptoPrecision}`
      }

      return receiveAddress
    }

    case CHAIN_NAMESPACE.CosmosSdk: {
      if (!amountCryptoPrecision) {
        return receiveAddress
      }

      const scheme = CHAIN_ID_TO_URN_SCHEME[chainId]
      if (scheme) {
        return `${scheme}:${receiveAddress}?amount=${amountCryptoPrecision}`
      }

      return receiveAddress
    }

    case CHAIN_NAMESPACE.Solana: {
      const isTokenAsset = isToken(assetId)

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

    case CHAIN_NAMESPACE.Evm: {
      const evmNetworkId = Number(fromChainId(chainId).chainReference)
      const isTokenAsset = isToken(assetId)

      if (!amountCryptoPrecision) {
        return `ethereum:${receiveAddress}@${evmNetworkId}`
      }

      if (isTokenAsset) {
        // ERC-20 token transfer: ethereum:{tokenContract}@{chainId}/transfer?address={userAddress}&uint256={tokenAmount}
        const { assetReference: tokenContract } = fromAssetId(assetId)
        const amountBaseUnit = toBaseUnit(amountCryptoPrecision, asset.precision)
        return `ethereum:${tokenContract}@${evmNetworkId}/transfer?address=${receiveAddress}&uint256=${amountBaseUnit}`
      }

      // Native token: ethereum:{address}@{chainId}?value={amountInWei}
      const amountBaseUnit = toBaseUnit(amountCryptoPrecision, asset.precision)
      return `ethereum:${receiveAddress}@${evmNetworkId}?value=${amountBaseUnit}`
    }

    default:
      return receiveAddress
  }
}
