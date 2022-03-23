import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { DefiManagerProvider } from 'features/defi/contexts/DefiManagerProvider/DefiManagerProvider'
import React from 'react'
import { I18n } from 'react-polyglot'
import { Provider as ReduxProvider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { PersistGate } from 'redux-persist/integration/react'
import { ScrollToTop } from 'Routes/ScrollToTop'
import { translations } from 'assets/translations'
import { BrowserRouterProvider } from 'context/BrowserRouterProvider/BrowserRouterProvider'
import { PluginProvider } from 'context/PluginProvider/PluginProvider'
import { ChainAdaptersProvider } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { MarketDataProvider } from 'context/MarketDataProvider/MarketDataProvider'
import { ModalProvider } from 'context/ModalProvider/ModalProvider'
import { PortfolioProvider } from 'context/PortfolioProvider/PortfolioContext'
import { TransactionsProvider } from 'context/TransactionsProvider/TransactionsProvider'
import { WalletProvider } from 'context/WalletProvider/WalletProvider'
import { simpleLocale } from 'lib/browserLocale'
import { SplashScreen } from 'pages/SplashScreen/SplashScreen'
import { persistor, store } from 'state/store'
import { theme } from 'theme/theme'

const locale: string = simpleLocale()
const messages = translations[locale]

type ProvidersProps = {
  children: React.ReactNode
}

export function AppProviders({ children }: ProvidersProps) {
  return (
    <ReduxProvider store={store}>
      <PluginProvider>
        <ChakraProvider theme={theme}>
          <ColorModeScript />
          <PersistGate loading={<SplashScreen />} persistor={persistor}>
            <BrowserRouter>
              <ScrollToTop />
              <BrowserRouterProvider>
                <I18n locale={locale} messages={messages}>
                  <WalletProvider>
                    <PortfolioProvider>
                      <MarketDataProvider>
                        <TransactionsProvider>
                          <ModalProvider>
                            <DefiManagerProvider>{children}</DefiManagerProvider>
                          </ModalProvider>
                        </TransactionsProvider>
                      </MarketDataProvider>
                    </PortfolioProvider>
                  </WalletProvider>
                </I18n>
              </BrowserRouterProvider>
            </BrowserRouter>
          </PersistGate>
        </ChakraProvider>
      </PluginProvider>
    </ReduxProvider>
  )
}
