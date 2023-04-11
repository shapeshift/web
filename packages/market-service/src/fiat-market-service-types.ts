import type { HistoryData, HistoryTimeframe, MarketData } from '@shapeshiftoss/types'

/**
 * stackedQ: We need the list in the frontend,
 * and there's no way to convert an union type to an array,
 * so the list is defined as an array of strings,
 * but SupportedFiatCurrencies is an union of strings
 */
export const SupportedFiatCurrenciesList = Object.freeze([
  'CNY',
  'USD',
  'EUR',
  'JPY',
  'GBP',
  'KRW',
  'INR',
  'CAD',
  'HKD',
  'AUD',
  'TWD',
  'BRL',
  'CHF',
  'THB',
  'MXN',
  'RUB',
  'SAR',
  'SGD',
  'ILS',
  'IDR',
] as const)

export type SupportedFiatCurrencies = typeof SupportedFiatCurrenciesList[number]

export type FiatMarketDataArgs = {
  symbol: SupportedFiatCurrencies
}

export type FiatPriceHistoryArgs = {
  symbol: SupportedFiatCurrencies
  timeframe: HistoryTimeframe
}

export type FindByFiatMarketType = (args: FiatMarketDataArgs) => Promise<MarketData | null>

export type FiatPriceHistoryType = (args: FiatPriceHistoryArgs) => Promise<HistoryData[]>
