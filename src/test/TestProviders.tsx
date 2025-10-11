import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import React from 'react'
import { I18n } from 'react-polyglot'
import { Provider as ReduxProvider } from 'react-redux'

import { translations } from '@/assets/translations'
import { ModalStackProvider } from '@/context/ModalStackProvider'
import { store } from '@/state/store'

const locale: string = navigator?.language?.split('-')[0] ?? 'en'
const messages = translations['en']

const queryClient = new QueryClient()

export const TestProviders: React.FC<PropsWithChildren> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <ReduxProvider store={store}>
      <I18n locale={locale} messages={messages}>
        <ModalStackProvider>{children}</ModalStackProvider>
      </I18n>
    </ReduxProvider>
  </QueryClientProvider>
)
