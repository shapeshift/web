import get from 'lodash/get'
import type { InterpolationOptions } from 'node-polyglot'
import { transformPhrase } from 'node-polyglot'
import { useCallback } from 'react'
import { I18n } from 'react-polyglot'
import { translations } from 'assets/translations'
import { selectSelectedLocale } from 'state/selectors'
import { useAppSelector } from 'state/store'

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const locale: string = useAppSelector(selectSelectedLocale)
  const messages = translations[locale]
  const onMissingKey = useCallback((key: string, substitutions?: InterpolationOptions) => {
    const translation = get(translations['en'], key)
    return typeof translation === 'string' ? transformPhrase(translation, substitutions) : key
  }, [])
  return (
    <I18n locale={locale} messages={messages} allowMissing={true} onMissingKey={onMissingKey}>
      {children}
    </I18n>
  )
}
