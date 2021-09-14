import { AssetService } from '@shapeshiftoss/asset-service'
import { I18n } from 'react-polyglot'
import { translations } from 'assets/translations'
import { AssetContext } from 'context/AssetProvider/AssetProvider'

const locale: string = navigator?.language?.split('-')[0] ?? 'en'
const messages = translations['en']

const MockAsset = new AssetService()

export const TestProviders: React.FC = ({ children }) => (
  <I18n locale={locale} messages={messages}>
    {/* @ts-ignore remove error */}
    <AssetContext.Provider value={MockAsset}>{children}</AssetContext.Provider>
  </I18n>
)
