import type { AssetId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'
import axios from 'axios'

import { FiatRampAction } from '../FiatRampsCommon'
import type { CreateUrlProps } from '../types'

import { getConfig } from '@/config'
import type { CommonFiatCurrencies } from '@/lib/fiatCurrencies/fiatCurrencies'
import { isSome } from '@/lib/utils'

export { getMtPelerinQuote } from './mtpelerin/utils'

type MtPelerinResponse = {
  [identifier: string]: {
    symbol: string
  }
}

export const getMtPelerinFiatCurrencies = (): CommonFiatCurrencies[] => {
  // From https://www.mtpelerin.com/supported-blockchains-currencies -> Fiat
  return [
    'AED',
    'AUD',
    'CAD',
    'CHF',
    'CZK',
    'DKK',
    'EUR',
    'GBP',
    'HKD',
    'HUF',
    'JPY',
    'MXN',
    'NOK',
    'NZD',
    'PLN',
    'SEK',
    'SGD',
    'USD',
    'ZAR',
  ]
}

export async function getMtPelerinAssets(): Promise<AssetId[]> {
  const data = await (async () => {
    try {
      const url = getConfig().VITE_MTPELERIN_ASSETS_API
      const { data } = await axios.get<MtPelerinResponse>(url)
      return data
    } catch (e) {
      console.error(e)
    }
  })()

  if (!data) return []

  const mtPelerinSymbols = Object.values(data).map(({ symbol }) => symbol)
  return Array.from(
    new Set(mtPelerinSymbols.flatMap(symbol => adapters.mtPelerinSymbolToAssetIds(symbol))),
  ).filter(isSome)
}

export const createMtPelerinUrl = ({
  action,
  assetId,
  fiatCurrency,
  fiatAmount,
  amountCryptoPrecision,
  options: { mode, language },
}: CreateUrlProps): string => {
  const mtPelerinSymbol = adapters.assetIdToMtPelerinSymbol(assetId)
  if (!mtPelerinSymbol) throw new Error('Asset not supported by MtPelerin')
  const mtPelerinFiatCurrency =
    getMtPelerinFiatCurrencies().find(currency => currency === fiatCurrency) ?? 'EUR'
  /**
   * url usage:
   *   https://developers.mtpelerin.com/integration-guides/web-integration
   * params:
   *   https://developers.mtpelerin.com/integration-guides/options
   */
  const baseUrl = new URL(
    action === FiatRampAction.Sell
      ? getConfig().VITE_MTPELERIN_SELL_URL
      : getConfig().VITE_MTPELERIN_BUY_URL,
  )
  const params = new URLSearchParams()

  params.set('type', 'direct-link')
  // Default display tab
  params.set('tab', action === FiatRampAction.Sell ? 'sell' : 'buy')
  // Allows to only display the "Buy" or the "Sell" tab
  params.set('tabs', action === FiatRampAction.Sell ? 'sell' : 'buy')
  if (action === FiatRampAction.Sell) {
    // Default sell tab source currency
    params.set('ssc', mtPelerinSymbol)
    // Default sell tab destination currency
    params.set('sdc', mtPelerinFiatCurrency)
    // Sell tab source amount (crypto amount)
    if (amountCryptoPrecision) {
      params.set('ssa', amountCryptoPrecision)
    }
    // Sell tab destination amount (fiat amount)
    if (fiatAmount) {
      params.set('sda', fiatAmount)
    }
  } else {
    // Default buy tab destination currency
    params.set('bdc', mtPelerinSymbol)
    // Default buy tab source currency
    params.set('bsc', mtPelerinFiatCurrency)
    // Buy tab source amount (fiat amount)
    if (fiatAmount) {
      params.set('bsa', fiatAmount)
    }
    // Buy tab destination amount (crypto amount)
    if (amountCryptoPrecision) {
      params.set('bda', amountCryptoPrecision)
    }
  }
  const network = adapters.getMtPelerinNetFromAssetId(assetId)
  if (!network) throw new Error('Network not supported by MtPelerin')
  // Default network
  params.set('net', network)
  // List of authorized networks
  params.set('nets', network)
  // Integration authentication
  params.set('rfr', getConfig().VITE_MTPELERIN_REFERRAL_CODE)
  params.set('_ctkn', getConfig().VITE_MTPELERIN_INTEGRATION_KEY)
  //@TODO: Figure out how to sign a message using the wallet for us to be able to do this.
  //https://developers.mtpelerin.com/integration-guides/options
  // params.set('addr', address)
  // params.set('code', code)
  params.set('lang', language)
  params.set('mode', mode)

  return `${baseUrl.toString()}?${params.toString()}`
}
