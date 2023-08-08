import type { AssetId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import head from 'lodash/head'

import type { CommonFiatCurrencies } from '../config'
import { FiatRampAction } from '../FiatRampsCommon'
import type { CreateUrlProps } from '../types'

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
    const baseUrl = getConfig().REACT_APP_ONRAMPER_API_URL
    const apiKey = getConfig().REACT_APP_ONRAMPER_API_KEY
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

export const createOnRamperUrl = ({
  action,
  assetId,
  address,
  options: { language, mode, currentUrl },
}: CreateUrlProps): string => {
  const onRamperSymbols = adapters.assetIdToOnRamperTokenList(assetId)
  if (!onRamperSymbols) throw new Error('Asset not supported by OnRamper')

  const baseUrl = getConfig().REACT_APP_ONRAMPER_WIDGET_URL
  const apiKey = getConfig().REACT_APP_ONRAMPER_API_KEY

  const params = new URLSearchParams()
  const defaultCrypto = head(onRamperSymbols)!!

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

  params.set('themeName', mode === 'dark' ? 'dark' : 'light')
  currentUrl && params.set('redirectURL', currentUrl)

  return `${baseUrl.toString()}?${params.toString()}`
}
