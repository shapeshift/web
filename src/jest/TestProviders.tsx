import { I18n } from 'react-polyglot'
import { translations } from 'assets/translations'
import { AssetContext } from 'context/AssetProvider/AssetProvider'

const locale: string = navigator?.language?.split('-')[0] ?? 'en'
const messages = translations['en']

const MockAssetService = {
  initialize: () => {},
  byNetwork: () => {},
  byTokenId: () => {},
  description: () => {},
  isInitialized: true
}

export const TestProviders: React.FC = ({ children }) => (
  <I18n locale={locale} messages={messages}>
    {/* @ts-ignore remove warning */}
    <AssetContext.Provider value={MockAssetService}>{children}</AssetContext.Provider>
  </I18n>
)
