import { ChakraProvider, ColorModeScript, createLocalStorageManager } from '@chakra-ui/react'
import React, { useCallback } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { HelmetProvider } from 'react-helmet-async'
import { Provider as ReduxProvider } from 'react-redux'
import { HashRouter } from 'react-router-dom'
import { PersistGate } from 'redux-persist/integration/react'
import { WagmiProvider } from 'wagmi'

import { ScrollToTop } from './Routes/ScrollToTop'

import { ChatwootWidget } from '@/components/ChatWoot'
import { ActionCenterProvider } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { AppProvider } from '@/context/AppProvider/AppContext'
import { BrowserRouterProvider } from '@/context/BrowserRouterProvider/BrowserRouterProvider'
import { I18nProvider } from '@/context/I18nProvider/I18nProvider'
import { ModalProvider } from '@/context/ModalProvider/ModalProvider'
import { PluginProvider } from '@/context/PluginProvider/PluginProvider'
import { QueryClientProvider } from '@/context/QueryClientProvider/QueryClientProvider'
import { KeepKeyProvider } from '@/context/WalletProvider/KeepKeyProvider'
import { WalletProvider } from '@/context/WalletProvider/WalletProvider'
import { DefiManagerProvider } from '@/features/defi/contexts/DefiManagerProvider/DefiManagerProvider'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { wagmiConfig } from '@/lib/wagmi-config'
import { ErrorPage } from '@/pages/ErrorPage/ErrorPage'
import { SplashScreen } from '@/pages/SplashScreen/SplashScreen'
import { WalletConnectV2Provider } from '@/plugins/walletConnectToDapps/WalletConnectV2Provider'
import { persistor, store } from '@/state/store'
import { theme } from '@/theme/theme'
import { captureExceptionWithContext } from '@/utils/sentry/helpers'

type ProvidersProps = {
  children: React.ReactNode
}

const manager = createLocalStorageManager('ss-theme')

const splashScreen = <SplashScreen />

export function AppProviders({ children }: ProvidersProps) {
  const handleError = useCallback(
    (
      error: Error,
      info: {
        componentStack: string
      },
    ) => {
      captureExceptionWithContext(error, {
        tags: {
          errorBoundary: 'AppProviders',
          critical: 'true',
        },
        extra: {
          componentStack: info.componentStack,
        },
        level: 'fatal',
      })
      getMixPanel()?.track(MixPanelEvent.Error, { error, info })
    },
    [],
  )
  return (
    <HelmetProvider>
      <ReduxProvider store={store}>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider>
            <PluginProvider>
              <ColorModeScript storageKey='ss-theme' />
              <ChatwootWidget />
              <I18nProvider>
                <ChakraProvider theme={theme} colorModeManager={manager} cssVarsRoot='body'>
                  <PersistGate loading={splashScreen} persistor={persistor}>
                    <HashRouter basename='/'>
                      <ScrollToTop />
                      <BrowserRouterProvider>
                        <WalletProvider>
                          <KeepKeyProvider>
                            <WalletConnectV2Provider>
                              <ActionCenterProvider>
                                <ModalProvider>
                                  <ErrorBoundary
                                    FallbackComponent={ErrorPage}
                                    onError={handleError}
                                  >
                                    <AppProvider>
                                      <DefiManagerProvider>{children}</DefiManagerProvider>
                                    </AppProvider>
                                  </ErrorBoundary>
                                </ModalProvider>
                              </ActionCenterProvider>
                            </WalletConnectV2Provider>
                          </KeepKeyProvider>
                        </WalletProvider>
                      </BrowserRouterProvider>
                    </HashRouter>
                  </PersistGate>
                </ChakraProvider>
              </I18nProvider>
            </PluginProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ReduxProvider>
    </HelmetProvider>
  )
}
