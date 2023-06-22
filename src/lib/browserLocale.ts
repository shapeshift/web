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

function getPreferredLanguageMaybeWithRegion(): string {
  const languages = window?.navigator?.languages ?? navigator?.language

  if (!languages || languages.length === 0) {
    return 'en-US' // Return a default language-region there is no preference
  }
  const [baseLanguage, region] = languages[0].split('-')
  if (region) {
    return languages[0] // If the first language has a regional code, return it
  }
  // Othereise look for a language with the same base language and a regional code
  for (const lang of languages.slice(1)) {
    const [otherBaseLanguage, otherRegion] = lang.split('-')
    if (otherBaseLanguage === baseLanguage && otherRegion) {
      return lang
    }
  }

  return baseLanguage // If none was found found, return the base language
}

export function defaultBrowserCurrency(): SupportedFiatCurrencies {
  const userLocale = getPreferredLanguageMaybeWithRegion()
  const userCurrency = getCurrency(userLocale) as SupportedFiatCurrencies
  return SupportedFiatCurrenciesList?.includes(userCurrency) ? userCurrency : DEFAULT_FIAT_CURRENCY
}
