import {
  ChakraProvider,
  ColorModeScript,
  createLocalStorageManager,
  createStandaloneToast,
} from '@chakra-ui/react'
import { captureException } from '@sentry/react'
import {
  QueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
} from '@tanstack/react-query'
import React, { useCallback } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { HelmetProvider } from 'react-helmet-async'
import { Provider as ReduxProvider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { WagmiProvider } from 'wagmi'

import { ConditionalRouter } from './context/ConditionalRouter'
import { ScrollToTop } from './Routes/ScrollToTop'

import { ChatwootWidget } from '@/components/ChatWoot'
import { AppProvider } from '@/context/AppProvider/AppContext'
import { BrowserRouterProvider } from '@/context/BrowserRouterProvider/BrowserRouterProvider'
import { FoxEthProvider } from '@/context/FoxEthProvider/FoxEthProvider'
import { I18nProvider } from '@/context/I18nProvider/I18nProvider'
import { ModalProvider } from '@/context/ModalProvider/ModalProvider'
import { PluginProvider } from '@/context/PluginProvider/PluginProvider'
import { QueryClientProvider } from '@/context/QueryClientProvider/QueryClientProvider'
import { TransactionsProvider } from '@/context/TransactionsProvider/TransactionsProvider'
import { KeepKeyProvider } from '@/context/WalletProvider/KeepKeyProvider'
import { WalletProvider } from '@/context/WalletProvider/WalletProvider'
import { DefiManagerProvider } from '@/features/defi/contexts/DefiManagerProvider/DefiManagerProvider'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { wagmiConfig } from '@/lib/wagmi-config'
import { ErrorPage } from '@/pages/ErrorPage/ErrorPage'
import { FoxPageProvider } from '@/pages/Fox/hooks/useFoxPageContext'
import { RFOXProvider } from '@/pages/RFOX/hooks/useRfoxContext'
import { SplashScreen } from '@/pages/SplashScreen/SplashScreen'
import { WalletConnectV2Provider } from '@/plugins/walletConnectToDapps/WalletConnectV2Provider'
import { persistor, store } from '@/state/store'
import { theme } from '@/theme/theme'

type ProvidersProps = {
  children: React.ReactNode
}

const manager = createLocalStorageManager('ss-theme')

const splashScreen = <SplashScreen />

const queryClient = new QueryClient()

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
        <WagmiProvider config={wagmiConfig}>
          <TanstackQueryClientProvider client={queryClient}>
            <QueryClientProvider>
              <PluginProvider>
                <ColorModeScript storageKey='ss-theme' />
                <ChatwootWidget />
                <ChakraProvider theme={theme} colorModeManager={manager} cssVarsRoot='body'>
                  <ToastContainer />
                  <PersistGate loading={splashScreen} persistor={persistor}>
                    <ConditionalRouter basename='/'>
                      <ScrollToTop />
                      <BrowserRouterProvider>
                        <I18nProvider>
                          <WalletProvider>
                            <KeepKeyProvider>
                              <WalletConnectV2Provider>
                                <ModalProvider>
                                  <ErrorBoundary
                                    FallbackComponent={ErrorPage}
                                    onError={handleError}
                                  >
                                    <TransactionsProvider>
                                      <AppProvider>
                                        <FoxEthProvider>
                                          <DefiManagerProvider>
                                            <RFOXProvider>
                                              <FoxPageProvider>{children}</FoxPageProvider>
                                            </RFOXProvider>
                                          </DefiManagerProvider>
                                        </FoxEthProvider>
                                      </AppProvider>
                                    </TransactionsProvider>
                                  </ErrorBoundary>
                                </ModalProvider>
                              </WalletConnectV2Provider>
                            </KeepKeyProvider>
                          </WalletProvider>
                        </I18nProvider>
                      </BrowserRouterProvider>
                    </ConditionalRouter>
                  </PersistGate>
                </ChakraProvider>
              </PluginProvider>
            </QueryClientProvider>
          </TanstackQueryClientProvider>
        </WagmiProvider>
      </ReduxProvider>
    </HelmetProvider>
  )
}
