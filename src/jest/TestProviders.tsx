import { I18n } from 'react-polyglot'
import { translations } from 'assets/translations'

const locale: string = navigator?.language?.split('-')[0] ?? 'en'
const messages = translations[locale]

export const TestProviders: React.FC = ({ children }) => (
  <I18n locale={locale} messages={messages}>
    {children}
  </I18n>
)
