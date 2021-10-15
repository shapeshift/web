import { getConfig } from 'config'
import { I18n } from 'react-polyglot'
import { translations } from 'assets/translations'
import { AssetContext } from 'context/AssetProvider/AssetProvider'
import { ChainAdaptersProvider } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'

const locale: string = navigator?.language?.split('-')[0] ?? 'en'
const messages = translations['en']

const MockAssetService = {
  initialize: () => {},
  byNetwork: () => {},
  byTokenId: () => {},
  description: () => {},
  isInitialized: true
}

const unchainedUrls = { ethereum: getConfig().REACT_APP_UNCHAINED_ETHEREUM_URL }

export const TestProviders: React.FC = ({ children }) => (
  <I18n locale={locale} messages={messages}>
    <ChainAdaptersProvider unchainedUrls={unchainedUrls}>
      {/* @ts-ignore remove warning */}
      <AssetContext.Provider value={MockAssetService}>{children}</AssetContext.Provider>
    </ChainAdaptersProvider>
  </I18n>
)
