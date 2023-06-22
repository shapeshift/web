import { CurrencyFormats } from 'constants/CurrencyFormatsEnum'
import { translations } from 'assets/translations'

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

export function defaultBrowserLanguage(): string {
  let locale: string = assumeLocale().split('-')[0] ?? assumeLocale()
  if (!Object.keys(translations).includes(locale)) {
    locale = 'en'
  }
  return locale
}

export function defaultBrowserCurrencyFormat(): CurrencyFormats | string {
  const userLocale = window?.navigator?.languages?.[0] ?? navigator?.language
  return userLocale ? userLocale : CurrencyFormats.CommaDecimal
}
