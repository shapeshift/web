import { I18n } from 'react-polyglot'
import { Provider as ReduxProvider } from 'react-redux'
import { translations } from 'assets/translations'
import { store } from 'state/store'

const locale: string = navigator?.language?.split('-')[0] ?? 'en'
const messages = translations['en']

export const TestProviders: React.FC = ({ children }) => (
  <ReduxProvider store={store}>
    <I18n locale={locale} messages={messages}>
      {/* @ts-ignore remove warning */}
      {children}
    </I18n>
  </ReduxProvider>
)
