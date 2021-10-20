import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { getConfig } from 'config'
import { FeatureFlagEnum } from 'constants/FeatureFlagEnum'
import React from 'react'
import { I18n } from 'react-polyglot'
import { Provider as ReduxProvider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { translations } from 'assets/translations'
import { ChainAdaptersProvider } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { EarnManagerProvider } from 'context/EarnManagerProvider/EarnManagerProvider'
import { ModalProvider } from 'context/ModalProvider/ModalProvider'
import { WalletProvider } from 'context/WalletProvider/WalletProvider'
import { useFeature } from 'hooks/useFeature/useFeature'
import { store } from 'state/store'
import { theme } from 'theme/theme'

const locale: string = navigator?.language?.split('-')[0] ?? 'en'
const messages = translations[locale] || translations['en']

type ProvidersProps = {
  children: React.ReactNode
}

const unchainedUrls = { ethereum: getConfig().REACT_APP_UNCHAINED_ETHEREUM_URL }

export function AppProviders({ children }: ProvidersProps) {
  const earnFeature = useFeature(FeatureFlagEnum.Yearn)
  const EarnProvider = earnFeature ? EarnManagerProvider : React.Fragment
  return (
    <ReduxProvider store={store}>
      <ChakraProvider theme={theme}>
        <ColorModeScript />
        <BrowserRouter>
          <I18n locale={locale} messages={messages}>
            <WalletProvider>
              <ChainAdaptersProvider unchainedUrls={unchainedUrls}>
                <ModalProvider>
                  <EarnProvider>{children}</EarnProvider>
                </ModalProvider>
              </ChainAdaptersProvider>
            </WalletProvider>
          </I18n>
        </BrowserRouter>
      </ChakraProvider>
    </ReduxProvider>
  )
}
