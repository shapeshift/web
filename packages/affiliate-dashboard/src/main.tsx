import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import type { Config } from 'wagmi'
import { WagmiProvider } from 'wagmi'

import { App } from './App'
import { wagmiAdapter } from './config/wagmi'
import { theme } from './theme'

if (!import.meta.env.VITE_API_URL) throw new Error('VITE_API_URL is not set')

const queryClient = new QueryClient()

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    <ChakraProvider theme={theme}>
      <WagmiProvider config={wagmiAdapter.wagmiConfig as unknown as Config}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </WagmiProvider>
    </ChakraProvider>
  </React.StrictMode>,
)
