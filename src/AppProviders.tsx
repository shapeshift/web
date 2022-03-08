import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { UnchainedUrls } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { DefiManagerProvider } from 'features/defi/contexts/DefiManagerProvider/DefiManagerProvider'
import React from 'react'
import { I18n } from 'react-polyglot'
import { Provider as ReduxProvider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { PersistGate } from 'redux-persist/integration/react'
import { ScrollToTop } from 'Routes/ScrollToTop'
import { translations } from 'assets/translations'
import { BrowserRouterProvider } from 'context/BrowserRouterProvider/BrowserRouterProvider'
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

const unchainedUrls: UnchainedUrls = {
  [ChainTypes.Ethereum]: {
    httpUrl: getConfig().REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL,
    wsUrl: getConfig().REACT_APP_UNCHAINED_ETHEREUM_WS_URL
  },
  [ChainTypes.Bitcoin]: {
    httpUrl: getConfig().REACT_APP_UNCHAINED_BITCOIN_HTTP_URL,
    wsUrl: getConfig().REACT_APP_UNCHAINED_BITCOIN_WS_URL
  },
  [ChainTypes.Cosmos]: {
    httpUrl: getConfig().REACT_APP_UNCHAINED_COSMOS_HTTP_URL,
    wsUrl: getConfig().REACT_APP_UNCHAINED_COSMOS_WS_URL
  }
}

export function AppProviders({ children }: ProvidersProps) {
  return (
    <ReduxProvider store={store}>
      <ChakraProvider theme={theme}>
        <ColorModeScript />
        <PersistGate loading={<SplashScreen />} persistor={persistor}>
          <BrowserRouter>
            <ScrollToTop />
            <BrowserRouterProvider>
              <I18n locale={locale} messages={messages}>
                <WalletProvider>
                  <ChainAdaptersProvider unchainedUrls={unchainedUrls}>
                    <PortfolioProvider>
                      <MarketDataProvider>
                        <TransactionsProvider>
                          <ModalProvider>
                            <DefiManagerProvider>{children}</DefiManagerProvider>
                          </ModalProvider>
                        </TransactionsProvider>
                      </MarketDataProvider>
                    </PortfolioProvider>
                  </ChainAdaptersProvider>
                </WalletProvider>
              </I18n>
            </BrowserRouterProvider>
          </BrowserRouter>
        </PersistGate>
      </ChakraProvider>
    </ReduxProvider>
  )
}
