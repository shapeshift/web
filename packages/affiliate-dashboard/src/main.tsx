import './config/wagmi'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { arbitrum } from 'viem/chains'
import { createConfig, http, WagmiProvider } from 'wagmi'

import { App } from './App'

const queryClient = new QueryClient()

const wagmiConfig = createConfig({
  chains: [arbitrum],
  transports: {
    [arbitrum.id]: http(),
  },
})

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
