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

export function simpleLocale() {
  let locale: string = assumeLocale().split('-')[0] ?? assumeLocale()
  if (!Object.keys(translations).includes(locale)) {
    locale = 'en'
  }
  return locale
}
