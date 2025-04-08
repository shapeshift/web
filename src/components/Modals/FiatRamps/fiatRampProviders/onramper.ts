import type { AssetId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'
import axios from 'axios'
import head from 'lodash/head'

import type { CommonFiatCurrencies } from '../config'
import { FiatRampAction } from '../FiatRampsCommon'
import type { CreateUrlProps } from '../types'

import { getConfig } from '@/config'

// Non-exhaustive required types definition. Full reference: https://github.com/onramper/widget/blob/master/package/src/ApiContext/api/types/gateways.ts
type Crypto = {
  id: string
  code: string
  name: string
  symbol: string
  network: string
  icon: string
}

type OnRamperGatewaysResponse = {
  message: {
    crypto: Crypto[]
  }
}

const getGatewayData = async () => {
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

export const getSupportedOnRamperFiatCurrencies = (): CommonFiatCurrencies[] => {
  return [
    'AOA',
    'AUD',
    'BBD',
    'BZD',
    'BMD',
    'BRL',
    'GBP',
    'BND',
    'BGN',
    'CAD',
    'XAF',
    'CLP',
    'CNY',
    'COP',
    'KMF',
    'CRC',
    'HRK',
    'CZK',
    'DKK',
    'DJF',
    'DOP',
    'XCD',
    'EGP',
    'EUR',
    'FKP',
    'FJD',
    'GEL',
    'GHS',
    'GIP',
    'GTQ',
    'HNL',
    'HKD',
    'HUF',
    'ISK',
    'IDR',
    'ILS',
    'JMD',
    'JPY',
    'JOD',
    'KZT',
    'KES',
    'KWD',
    'KGS',
    'MGA',
    'MWK',
    'MYR',
    'MRU',
    'MXN',
    'MDL',
    'MAD',
    'MZN',
    'TWD',
    'NZD',
    'NGN',
    'NOK',
    'OMR',
    'PKR',
    'PGK',
    'PYG',
    'PEN',
    'PHP',
    'PLN',
    'RON',
    'RWF',
    'STN',
    'SCR',
    'SGD',
    'SBD',
    'ZAR',
    'KRW',
    'LKR',
    'SRD',
    'SZL',
    'SEK',
    'CHF',
    'TJS',
    'TZS',
    'THB',
    'TOP',
    'TRY',
    'TMT',
    'UGX',
    'USD',
    'UYU',
    'VND',
  ]
}

export const getOnRamperAssets = async (): Promise<AssetId[]> => {
  const data = await getGatewayData()
  if (!data) return []
  return convertOnRamperDataToFiatRampAsset(data)
}

const convertOnRamperDataToFiatRampAsset = (response: OnRamperGatewaysResponse): AssetId[] => {
  return Array.from(
    new Set(
      response.message.crypto
        .map(currency => adapters.onRamperTokenIdToAssetId(currency.id))
        .filter((assetId): assetId is AssetId => Boolean(assetId)),
    ),
  )
}

// Function to generate HMAC SHA256 signature
const generateSignature = async (data: string): Promise<string> => {
  const secretKey = getConfig().VITE_ONRAMPER_SIGNING_KEY
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secretKey)
  const message = encoder.encode(data)

  // Using the Web Crypto API for HMAC-SHA256
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message)

  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export const createOnRamperUrl = async ({
  action,
  assetId,
  address,
  fiatCurrency,
  options: { language, mode, currentUrl },
}: CreateUrlProps): Promise<string> => {
  const onRamperSymbols = adapters.assetIdToOnRamperTokenList(assetId)
  if (!onRamperSymbols) throw new Error('Asset not supported by OnRamper')

  const baseUrl = getConfig().VITE_ONRAMPER_WIDGET_URL
  const apiKey = getConfig().VITE_ONRAMPER_API_KEY

  const params = new URLSearchParams()
  const defaultCrypto = head(onRamperSymbols)

  // This should not happen really, head() is just strongly typed in favour of safety but we should have at least one symbol really
  // Unless we don't? I mean that's what safety is for, hey
  if (!defaultCrypto) throw new Error('Failed to get onRamperSymbols head')

  params.set('apiKey', apiKey)
  params.set('defaultCrypto', defaultCrypto)
  params.set('wallets', `${defaultCrypto}:${address}`)

  if (action === FiatRampAction.Sell) {
    // Note: selling via OnRamper does not allow selecting the currency, their api currently does not support it
    params.set('initScreen', 'sell')
    params.set('supportSell', 'true')
    params.set('isAddressEditable', 'true')
  } else {
    params.set('onlyCryptos', onRamperSymbols.join(','))
    params.set('supportSell', 'false')
    params.set('isAddressEditable', 'false')
  }
  params.set('language', language)
  params.set('defaultFiat', fiatCurrency)

  params.set('themeName', mode === 'dark' ? 'dark' : 'light')
  currentUrl && params.set('redirectURL', currentUrl)

  const originalurl = `${baseUrl.toString()}?${params.toString()}`
  // Copy me from console.log or debugger, and paste me in https://docs.onramper.com/docs/signing-widget-url#/ alongside the signing key
  console.log({ originalurl })
  debugger

  const walletParam = `wallets=${defaultCrypto}:${address}`
  const signature = await generateSignature(walletParam)
  params.set('signature', signature)

  const signedUrl = `${baseUrl.toString()}?${params.toString()}`

  // Then, verify the signedUrl here has the same signature as in the Onramper signing playground above
  console.log({ signedUrl })
  debugger

  return signedUrl
}
