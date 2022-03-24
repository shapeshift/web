import { I18n } from 'react-polyglot'
import { translations } from 'assets/translations'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const locale: string = useAppSelector(selectSelectedLocale)
  const messages = translations[locale]
  return (
    <I18n locale={locale} messages={messages}>
      {children}
    </I18n>
  )
}
