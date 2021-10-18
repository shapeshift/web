import { I18n } from 'react-polyglot'
import { translations } from 'assets/translations'

const locale: string = navigator?.language?.split('-')[0] ?? 'en'
const messages = translations['en']

export const TestProviders: React.FC = ({ children }) => (
  <I18n locale={locale} messages={messages}>
    {/* @ts-ignore remove warning */}
    {children}
  </I18n>
)
