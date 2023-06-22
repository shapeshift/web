import { DEFAULT_FIAT_CURRENCY } from 'constants/Config'
import { getCurrency } from 'locale-currency'
import { translations } from 'assets/translations'
import type { SupportedFiatCurrencies } from 'lib/market-service'
import { SupportedFiatCurrenciesList } from 'lib/market-service'

function assumeLocale() {
  if (typeof window === 'undefined' || typeof window.navigator === 'undefined') {
    return 'en'
  }
  if (navigator.languages && navigator.languages.length) {
    return navigator.languages[0]
  } else {
    return navigator.language || 'en'
  }
}

export function simpleLocale() {
  let locale: string = assumeLocale().split('-')[0] ?? assumeLocale()
  if (!Object.keys(translations).includes(locale)) {
    locale = 'en'
  }
  return locale
}

export function defaultBrowserCurrency(): SupportedFiatCurrencies {
  const userLocale = window?.navigator?.languages?.[0] ?? navigator?.language
  const userCurrency = getCurrency(userLocale) as SupportedFiatCurrencies
  return SupportedFiatCurrenciesList?.includes(userCurrency) ? userCurrency : DEFAULT_FIAT_CURRENCY
}
