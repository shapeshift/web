import { DEFAULT_FIAT_CURRENCY, DEFAULT_LANGUAGE } from 'constants/Config'
import { CurrencyFormat } from 'constants/constants'
import { getCurrency } from 'constants/LocaleFiatCurrenciesMap'
import { translations } from 'assets/translations'
import type { SupportedFiatCurrencies } from 'lib/market-service'
import { SupportedFiatCurrenciesList } from 'lib/market-service'

function isValidLocale(locale: string): boolean {
  try {
    const supportedLocales = Intl.Collator.supportedLocalesOf(locale)
    return supportedLocales.length > 0
  } catch (error) {
    return false
  }
}

function getPreferredLocaleMaybeWithRegion(): string {
  const languages = window?.navigator?.languages ?? [navigator?.language]
  // Return a default language-region if there is no preference
  if (languages.length === 0) {
    return CurrencyFormat.DotDecimal
  }

  const [baseLanguage, region] = languages[0].split('-')
  if (!isValidLocale(baseLanguage)) {
    return CurrencyFormat.DotDecimal
  }
  if (region) {
    return languages[0] // If the first language has a regional code, return it
  }

  // Otherwise, look for a language with the same base language and a regional code
  const languageWithRegion = languages.slice(1).find(lang => {
    const [otherBaseLanguage, otherRegion] = lang.split('-')
    return otherBaseLanguage === baseLanguage && otherRegion
  })

  return languageWithRegion ?? baseLanguage // If none was found, return the base language
}

export function defaultBrowserLanguage(): string {
  let locale: string =
    getPreferredLocaleMaybeWithRegion().split('-')[0] ?? getPreferredLocaleMaybeWithRegion()
  if (!Object.keys(translations).includes(locale)) {
    locale = DEFAULT_LANGUAGE
  }
  return locale
}

export function defaultBrowserCurrency(): SupportedFiatCurrencies {
  const userLocale = getPreferredLocaleMaybeWithRegion()
  const userCurrency = getCurrency(userLocale) as SupportedFiatCurrencies
  return SupportedFiatCurrenciesList?.includes(userCurrency) ? userCurrency : DEFAULT_FIAT_CURRENCY
}

export function defaultBrowserCurrencyFormat(): CurrencyFormat | string {
  return getPreferredLocaleMaybeWithRegion()
}
