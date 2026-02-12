import { CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { isToken } from '@shapeshiftoss/utils'
import { encodeURL } from '@solana/pay'
import { PublicKey } from '@solana/web3.js'
import bip21 from 'bip21'
import { build as buildEthUrl } from 'eth-url-parser'

import { CHAIN_ID_TO_URN_SCHEME, EMPTY_ADDRESS_ERROR } from './constants'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { toBaseUnit } from '@/lib/math'

export type GenerateReceiveQrTextArgs = {
  receiveAddress: string
  asset: Asset
  amountCryptoPrecision?: string
}

export const generateReceiveQrText = ({
  receiveAddress,
  asset,
  amountCryptoPrecision,
}: GenerateReceiveQrTextArgs): string => {
  if (!receiveAddress) {
    throw new Error(EMPTY_ADDRESS_ERROR)
  }

  const { chainId, assetId } = asset
  const { chainNamespace } = fromChainId(chainId)
  const scheme = CHAIN_ID_TO_URN_SCHEME[chainId]

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Utxo: {
      if (!amountCryptoPrecision) return receiveAddress
      if (!scheme) return receiveAddress

      const cleanAddress = receiveAddress.replace('bitcoincash:', '')
      return bip21.encode(cleanAddress, { amount: amountCryptoPrecision }, scheme)
    }

    case CHAIN_NAMESPACE.CosmosSdk: {
      if (!amountCryptoPrecision) return receiveAddress
      if (!scheme) return receiveAddress

      return bip21.encode(receiveAddress, { amount: amountCryptoPrecision }, scheme)
    }

    case CHAIN_NAMESPACE.Solana: {
      if (!amountCryptoPrecision) return receiveAddress

      if (isToken(assetId)) {
        const { assetReference } = fromAssetId(assetId)
        return encodeURL({
          recipient: new PublicKey(receiveAddress),
          amount: bnOrZero(amountCryptoPrecision),
          splToken: new PublicKey(assetReference),
        }).toString()
      }

      return encodeURL({
        recipient: new PublicKey(receiveAddress),
        amount: bnOrZero(amountCryptoPrecision),
      }).toString()
    }

    case CHAIN_NAMESPACE.Evm: {
      const evmNetworkId = Number(fromChainId(chainId).chainReference)

      if (!amountCryptoPrecision) {
        return buildEthUrl({
          target_address: receiveAddress,
          chain_id: `${evmNetworkId}`,
        })
      }

      const amountBaseUnit = toBaseUnit(amountCryptoPrecision, asset.precision)

      if (isToken(assetId)) {
        const { assetReference } = fromAssetId(assetId)
        return buildEthUrl({
          target_address: assetReference,
          chain_id: `${evmNetworkId}`,
          function_name: 'transfer',
          parameters: {
            address: receiveAddress,
            uint256: amountBaseUnit,
          },
        })
      }

      return buildEthUrl({
        target_address: receiveAddress,
        chain_id: `${evmNetworkId}`,
        parameters: {
          value: amountBaseUnit,
        },
      })
    }

    default:
      return receiveAddress
  }
}
