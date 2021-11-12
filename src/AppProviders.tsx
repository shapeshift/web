import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { UnchainedUrls } from '@shapeshiftoss/chain-adapters'
import { getConfig } from 'config'
import { FeatureFlagEnum } from 'constants/FeatureFlagEnum'
import { EarnManagerProvider } from 'features/earn/contexts/EarnManagerProvider/EarnManagerProvider'
import React from 'react'
import { I18n } from 'react-polyglot'
import { Provider as ReduxProvider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { translations } from 'assets/translations'
import { BrowserRouterProvider } from 'context/BrowserRouterProvider/BrowserRouterProvider'
import { ChainAdaptersProvider } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { ModalProvider } from 'context/ModalProvider/ModalProvider'
import { TransactionsProvider } from 'context/TransactionsProvider/TransactionsProvider'
import { WalletProvider } from 'context/WalletProvider/WalletProvider'
import { useFeature } from 'hooks/useFeature/useFeature'
import { store } from 'state/store'
import { theme } from 'theme/theme'

const locale: string = navigator?.language?.split('-')[0] ?? 'en'
const messages = translations[locale] || translations['en']

type ProvidersProps = {
  children: React.ReactNode
}

const unchainedUrls: UnchainedUrls = {
  ethereum: {
    httpUrl: getConfig().REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL,
    wsUrl: getConfig().REACT_APP_UNCHAINED_ETHEREUM_WS_URL
  },
  bitcoin: {
    httpUrl: getConfig().REACT_APP_UNCHAINED_BITCOIN_HTTP_URL,
    wsUrl: getConfig().REACT_APP_UNCHAINED_BITCOIN_WS_URL
  }
}

export function AppProviders({ children }: ProvidersProps) {
  const earnFeature = useFeature(FeatureFlagEnum.Yearn)
  const EarnProvider = earnFeature ? EarnManagerProvider : React.Fragment
  return (
    <ReduxProvider store={store}>
      <ChakraProvider theme={theme}>
        <ColorModeScript />
        <BrowserRouter>
          <BrowserRouterProvider>
            <I18n locale={locale} messages={messages}>
              <ModalProvider>
                <WalletProvider>
                  <ChainAdaptersProvider unchainedUrls={unchainedUrls}>
                    <TransactionsProvider>
                      <EarnProvider>{children}</EarnProvider>
                    </TransactionsProvider>
                  </ChainAdaptersProvider>
                </WalletProvider>
              </ModalProvider>
            </I18n>
          </BrowserRouterProvider>
        </BrowserRouter>
      </ChakraProvider>
    </ReduxProvider>
  )
}
