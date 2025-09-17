import type { AssetId } from '@shapeshiftoss/caip'
import { adapters, ASSET_NAMESPACE, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import { isAddress, zeroAddress } from 'viem'

import type { GetQuotesProps, RampQuote } from '../../config'
import { getChainIdFromOnramperNetwork } from './constants'
import type { Crypto, OnramperBuyQuoteResponse, OnRamperGatewaysResponse } from './types'

import OnRamperLogo from '@/assets/onramper-logo.svg'
import { getConfig } from '@/config'
import { bnOrZero } from '@/lib/bignumber/bignumber'

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

const aggregatePaymentMethodSupport = (quotes: OnramperBuyQuoteResponse) => {
  const allPaymentMethods = quotes.flatMap(quote => quote.availablePaymentMethods || [])
  const supportedMethods = allPaymentMethods.map(method => method.paymentTypeId?.toLowerCase())

  return {
    isCreditCard: supportedMethods.some(
      method => method?.includes('card') || method?.includes('credit') || method?.includes('debit'),
    ),
    isBankTransfer: supportedMethods.some(
      method =>
        method?.includes('bank') || method?.includes('transfer') || method?.includes('wire'),
    ),
    isApplePay: supportedMethods.some(method => method?.includes('apple')),
    isGooglePay: supportedMethods.some(method => method?.includes('google')),
    isSepa: supportedMethods.some(method => method?.includes('sepa')),
  }
}

const convertOnramperQuotesToSingleRampQuote = (
  onramperQuotes: OnramperBuyQuoteResponse,
  amount: string,
  direction: 'buy' | 'sell',
): RampQuote | null => {
  if (!onramperQuotes || onramperQuotes.length === 0) {
    return null
  }

  // Find the best quote (highest rate for buy, lowest rate for sell)
  const bestQuote = onramperQuotes.reduce((best, current) => {
    if (!current.rate || !best.rate) return best
    return direction === 'buy'
      ? current.rate > best.rate
        ? current
        : best
      : current.rate < best.rate
      ? current
      : best
  })

  const paymentMethodSupport = aggregatePaymentMethodSupport(onramperQuotes)

  return {
    id: `onramper-aggregated-${bestQuote.quoteId || 'quote'}`,
    provider: 'OnRamper',
    providerLogo: OnRamperLogo,
    rate: bestQuote.rate?.toString() || '0',
    amount: direction === 'buy' ? bnOrZero(bestQuote.payout).toFixed() : amount,
    isBestRate: true, // This is the best rate from OnRamper
    isFastest: false, // OnRamper doesn't provide speed information
    ...paymentMethodSupport,
  }
}

// https://docs.onramper.com/reference/get_quotes-fiat-crypto
export const getOnramperQuote = async ({
  fiat,
  crypto,
  amount,
  direction,
}: GetQuotesProps): Promise<RampQuote | null> => {
  try {
    const baseUrl = getConfig().VITE_ONRAMPER_API_URL
    const apiKey = getConfig().VITE_ONRAMPER_API_KEY

    const url =
      direction === 'buy'
        ? `${baseUrl}quotes/${fiat.toLowerCase()}/${crypto.toLowerCase()}?amount=${amount}`
        : `${baseUrl}quotes/${crypto.toLowerCase()}/${fiat.toLowerCase()}?amount=${amount}&type=sell`

    const response = await axios.get<OnramperBuyQuoteResponse>(url, {
      headers: {
        Authorization: apiKey,
      },
    })

    return convertOnramperQuotesToSingleRampQuote(response.data, amount, direction)
  } catch (e) {
    console.error('Error fetching OnRamper quotes:', e)
    return null
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
