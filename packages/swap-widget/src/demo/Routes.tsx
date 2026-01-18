import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { darkTheme, lightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { useMemo, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'

import { createWagmiConfig } from '../config/wagmi'
import type { WagmiConfig } from '../config/wagmi'
import { App } from './App'
import { QrApp } from './QrApp'

const config: WagmiConfig = createWagmiConfig('f58c0242def84c3b9befe9b1e6086bbd')
const queryClient = new QueryClient()

export const AppRoutes = () => {
  const [theme] = useState<'light' | 'dark'>('dark')
  const rainbowTheme = useMemo(() => (theme === 'dark' ? darkTheme() : lightTheme()), [theme])

  return (
    <BrowserRouter>
      <WagmiProvider config={config as any}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider theme={rainbowTheme}>
            <Routes>
              <Route path='/' element={<App />} />
              <Route path='/qr' element={<QrApp />} />
            </Routes>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </BrowserRouter>
  )
}
