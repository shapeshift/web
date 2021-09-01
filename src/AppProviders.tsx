import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { translations } from 'assets/translations'
import { ChainAdaptersProvider } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { ModalProvider } from 'context/ModalProvider/ModalProvider'
import { WalletProvider } from 'context/WalletProvider/WalletProvider'
import React from 'react'
import { I18n } from 'react-polyglot'
import { Provider as ReduxProvider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { store } from 'state/store'
import { theme } from 'theme/theme'

const locale: string = navigator?.language?.split('-')[0] ?? 'en'
const messages = translations[locale]

type ProvidersProps = {
  children: React.ReactNode
}

const unchainedUrls = {
  ethereum: 'http://localhost:31300/api/v1'
}

export function AppProviders({ children }: ProvidersProps) {
  return (
    <ReduxProvider store={store}>
      <ChakraProvider theme={theme}>
        <ColorModeScript />
        <BrowserRouter>
          <I18n locale={locale} messages={messages}>
            <ModalProvider>
              <WalletProvider>
                <ChainAdaptersProvider unchainedUrls={unchainedUrls}>
                  {children}
                </ChainAdaptersProvider>
              </WalletProvider>
            </ModalProvider>
          </I18n>
        </BrowserRouter>
      </ChakraProvider>
    </ReduxProvider>
  )
}
