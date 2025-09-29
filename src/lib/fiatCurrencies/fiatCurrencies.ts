import commonFiatCurrencyList from './FiatCurrencyList.json'

import type { SupportedFiatCurrencies } from '@/lib/market-service'

export type FiatCurrencyItem = {
  symbol: string
  name: string
  symbol_native?: string
  decimal_digits?: number
  rounding?: number
  code: SupportedFiatCurrencies
  name_plural?: string
}

export type CommonFiatCurrencies = keyof typeof commonFiatCurrencyList

export const fiatCurrencies = Object.keys(commonFiatCurrencyList) as CommonFiatCurrencies[]

export const fiatCurrencyItems = Object.entries(commonFiatCurrencyList).map(([code, currency]) => ({
  ...currency,
  code,
})) as FiatCurrencyItem[]

export const fiatCurrencyItemsByCode = fiatCurrencyItems.reduce(
  (acc, fiat) => {
    acc[fiat.code] = fiat
    return acc
  },
  {} as Record<string, FiatCurrencyItem>,
)

export const fiatCurrencyFlagUrlsByCode = fiatCurrencyItems.reduce(
  (acc, fiat) => {
    acc[fiat.code] = `/images/fiat-flags/${fiat.code.toLowerCase()}_40px.png`
    return acc
  },
  {} as Record<string, string>,
)
