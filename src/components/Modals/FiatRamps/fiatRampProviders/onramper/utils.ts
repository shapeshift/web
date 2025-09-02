import type { AssetId } from '@shapeshiftoss/caip'
import { adapters, ASSET_NAMESPACE, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import { isAddress, zeroAddress } from 'viem'

import type { CommonFiatCurrencies } from '../../config'
import { getChainIdFromOnramperNetwork } from './constants'
import type { Crypto, OnramperBuyQuoteResponse, OnRamperGatewaysResponse } from './types'

import { getConfig } from '@/config'

// https://docs.onramper.com/reference/get_supported
export const getSupportedOnramperCurrencies = async () => {
  try {
    const baseUrl = getConfig().VITE_ONRAMPER_API_URL
    const apiKey = getConfig().VITE_ONRAMPER_API_KEY
    return (
      await axios.get<OnRamperGatewaysResponse>(`${baseUrl}supported`, {
        headers: {
          Authorization: apiKey,
        },
      })
    ).data
  } catch (e) {
    console.error(e)
  }
}

// https://docs.onramper.com/reference/get_quotes-fiat-crypto
export const getOnramperBuyQuote = async ({
  fiat,
  crypto,
  fiatAmount,
}: {
  fiat: CommonFiatCurrencies
  crypto: string
  fiatAmount: number
}) => {
  try {
    const baseUrl = getConfig().VITE_ONRAMPER_API_URL
    const apiKey = getConfig().VITE_ONRAMPER_API_KEY

    const url = `${baseUrl}quotes/${fiat.toLowerCase()}/${crypto.toLowerCase()}?amount=${fiatAmount}`

    return (
      await axios.get<OnramperBuyQuoteResponse>(url, {
        headers: {
          Authorization: apiKey,
        },
      })
    ).data
  } catch (e) {
    console.error(e)
  }
}

// Dynamic token resolution functions using Onramper API response
export const findOnramperTokenIdByAssetId = (
  assetId: AssetId,
  onramperCurrencies: OnRamperGatewaysResponse,
): string | undefined => {
  const { chainId, assetReference } = fromAssetId(assetId)

  // For native assets, use the existing mapping
  const nativeMapping = adapters.assetIdToOnRamperTokenList(assetId)
  if (nativeMapping && nativeMapping.length > 0) {
    return nativeMapping[0] // Return first available token ID
  }

  // For non-native assets, search in the API response
  const crypto = onramperCurrencies.message.crypto.find(currency => {
    // Match by network and address (not chainId, as some networks don't have chainId)
    if (currency.network && currency.address) {
      const expectedChainId = getChainIdFromOnramperNetwork(currency.network)
      return (
        expectedChainId === chainId &&
        currency.address.toLowerCase() === assetReference.toLowerCase()
      )
    }
    return false
  })

  return crypto?.id
}

export const findAssetIdByOnramperCrypto = (crypto: Crypto): AssetId | undefined => {
  const mappingAssetId = adapters.onRamperTokenIdToAssetId(crypto.id)
  if (mappingAssetId) return mappingAssetId

  if (crypto.network && crypto.address) {
    try {
      const chainId = getChainIdFromOnramperNetwork(crypto.network)
      if (!chainId) {
        console.warn(`Unsupported network: ${crypto.network}`)
        return undefined
      }

      const assetNamespace = (() => {
        if (crypto.network === 'solana') {
          return ASSET_NAMESPACE.splToken
        }
        // For native assets, we shouldn't end up here because of mappingAssetId above but for the sake of completeness.
        if (
          crypto.address === zeroAddress ||
          ['bitcoin', 'bitcoincash', 'dogecoin', 'litecoin', 'cosmos', 'thorchain'].includes(
            crypto.network,
          )
        ) {
          return ASSET_NAMESPACE.slip44
        }

        if (crypto.network === 'bsc') return ASSET_NAMESPACE.bep20

        if (crypto.chainId || isAddress(crypto.address)) return ASSET_NAMESPACE.erc20
      })()

      if (!assetNamespace) return

      const assetId = toAssetId({
        chainId,
        assetNamespace,
        assetReference: crypto.address,
      })

      return assetId
    } catch (error) {
      console.error('Failed to convert onramper token to AssetId:', error)
      return undefined
    }
  }

  return undefined
}
