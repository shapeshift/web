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

export const findOnramperTokenIdByAssetId = (
  assetId: AssetId,
  onramperCurrencies: OnRamperGatewaysResponse,
): string | undefined => {
  const { chainId, assetReference } = fromAssetId(assetId)

  const maybeMappingAssetIds = adapters.assetIdToOnRamperTokenList(assetId)

  // Return mapping onramper ID if available (i.e native assets)
  if (maybeMappingAssetIds && maybeMappingAssetIds.length > 0) {
    return maybeMappingAssetIds[0]
  }

  const crypto = onramperCurrencies.message.crypto.find(currency => {
    // Note network + address here = we do NOT use chainId, as it's only available for EVM networks, but not Ethereum
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
