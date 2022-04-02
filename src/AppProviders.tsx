import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { DefiManagerProvider } from 'features/defi/contexts/DefiManagerProvider/DefiManagerProvider'
import React from 'react'
import { Provider as ReduxProvider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { PersistGate } from 'redux-persist/integration/react'
import { ScrollToTop } from 'Routes/ScrollToTop'
import { BrowserRouterProvider } from 'context/BrowserRouterProvider/BrowserRouterProvider'
import { I18nProvider } from 'context/I18nProvider/I18nProvider'
import { MarketDataProvider } from 'context/MarketDataProvider/MarketDataProvider'
import { ModalProvider } from 'context/ModalProvider/ModalProvider'
import { PluginProvider } from 'context/PluginProvider/PluginProvider'
import { PortfolioProvider } from 'context/PortfolioProvider/PortfolioContext'
import { TransactionsProvider } from 'context/TransactionsProvider/TransactionsProvider'
import { KeepKeyProvider } from 'context/WalletProvider/KeepKeyProvider'
import { WalletProvider } from 'context/WalletProvider/WalletProvider'
import { SplashScreen } from 'pages/SplashScreen/SplashScreen'
import { persistor, store } from 'state/store'
import { theme } from 'theme/theme'

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
                <I18nProvider>
                  <WalletProvider>
                    <KeepKeyProvider>
                      <ModalProvider>
                        <PortfolioProvider>
                          <MarketDataProvider>
                            <TransactionsProvider>
                              <DefiManagerProvider>{children}</DefiManagerProvider>
                            </TransactionsProvider>
                          </MarketDataProvider>
                        </PortfolioProvider>
                      </ModalProvider>
                    </KeepKeyProvider>
                  </WalletProvider>
                </I18nProvider>
              </BrowserRouterProvider>
            </BrowserRouter>
          </PersistGate>
        </ChakraProvider>
      </PluginProvider>
    </ReduxProvider>
  )
}
