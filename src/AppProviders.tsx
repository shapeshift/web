import {
  ChakraProvider,
  ColorModeScript,
  createLocalStorageManager,
  createStandaloneToast,
} from '@chakra-ui/react'
import { captureException } from '@sentry/react'
import { DefiManagerProvider } from 'features/defi/contexts/DefiManagerProvider/DefiManagerProvider'
import { WalletConnectV2Provider } from 'plugins/walletConnectToDapps/WalletConnectV2Provider'
import React, { useCallback } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { HelmetProvider } from 'react-helmet-async'
import { Provider as ReduxProvider } from 'react-redux'
import { HashRouter } from 'react-router-dom'
import { PersistGate } from 'redux-persist/integration/react'
import { ScrollToTop } from 'Routes/ScrollToTop'
import { WagmiProvider } from 'wagmi'
import { ChatwootWidget } from 'components/ChatWoot'
import { AppProvider } from 'context/AppProvider/AppContext'
import { BrowserRouterProvider } from 'context/BrowserRouterProvider/BrowserRouterProvider'
import { FoxEthProvider } from 'context/FoxEthProvider/FoxEthProvider'
import { I18nProvider } from 'context/I18nProvider/I18nProvider'
import { ModalProvider } from 'context/ModalProvider/ModalProvider'
import { PluginProvider } from 'context/PluginProvider/PluginProvider'
import { QueryClientProvider } from 'context/QueryClientProvider/QueryClientProvider'
import { TransactionsProvider } from 'context/TransactionsProvider/TransactionsProvider'
import { KeepKeyProvider } from 'context/WalletProvider/KeepKeyProvider'
import { WalletProvider } from 'context/WalletProvider/WalletProvider'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { wagmiConfig } from 'lib/wagmi-config'
import { ErrorPage } from 'pages/ErrorPage/ErrorPage'
import { SplashScreen } from 'pages/SplashScreen/SplashScreen'
import { persistor, store } from 'state/store'
import { theme } from 'theme/theme'

type ProvidersProps = {
  children: React.ReactNode
}

const manager = createLocalStorageManager('ss-theme')

const splashScreen = <SplashScreen />

export function AppProviders({ children }: ProvidersProps) {
  const { ToastContainer } = createStandaloneToast()
  const handleError = useCallback(
    (
      error: Error,
      info: {
        componentStack: string
      },
    ) => {
      captureException(error)
      getMixPanel()?.track(MixPanelEvent.Error, { error, info })
    },
    [],
  )
  return (
    <HelmetProvider>
      <ReduxProvider store={store}>
        <PluginProvider>
          <ColorModeScript storageKey='ss-theme' />
          <ChatwootWidget />
          <ChakraProvider theme={theme} colorModeManager={manager} cssVarsRoot='body'>
            <ToastContainer />
            <PersistGate loading={splashScreen} persistor={persistor}>
              <HashRouter basename='/'>
                <ScrollToTop />
                <BrowserRouterProvider>
                  <I18nProvider>
                    <WalletProvider>
                      <KeepKeyProvider>
                        <ErrorBoundary FallbackComponent={ErrorPage} onError={handleError}>
                          <QueryClientProvider>
                            <WagmiProvider config={wagmiConfig}>
                              <ModalProvider>
                                <WalletConnectV2Provider>
                                  <TransactionsProvider>
                                    <AppProvider>
                                      <FoxEthProvider>
                                        <DefiManagerProvider>{children}</DefiManagerProvider>
                                      </FoxEthProvider>
                                    </AppProvider>
                                  </TransactionsProvider>
                                </WalletConnectV2Provider>
                              </ModalProvider>
                            </WagmiProvider>
                          </QueryClientProvider>
                        </ErrorBoundary>
                      </KeepKeyProvider>
                    </WalletProvider>
                  </I18nProvider>
                </BrowserRouterProvider>
              </HashRouter>
            </PersistGate>
          </ChakraProvider>
        </PluginProvider>
      </ReduxProvider>
    </HelmetProvider>
  )
}
