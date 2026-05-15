import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Config } from 'wagmi'
import { WagmiProvider } from 'wagmi'

import { getWagmiAdapter, initializeAppKit, isAppKitInitialized } from '../config/appkit'
import { useSwapWallet } from '../contexts/SwapWalletContext'
import { truncateAddress } from '../types'

const queryClient = new QueryClient()

type AppKitWalletProviderProps = {
  projectId?: string
  children: ReactNode
}

export const AppKitWalletProvider = ({ projectId, children }: AppKitWalletProviderProps) => {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (projectId) initializeAppKit(projectId)
    if (isAppKitInitialized()) setIsReady(true)
  }, [projectId])

  const wagmiConfig = useMemo((): Config | undefined => {
    if (!isReady) return undefined
    return getWagmiAdapter()?.wagmiConfig as unknown as Config | undefined
  }, [isReady])

  if (!wagmiConfig) return null

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

export const ConnectWalletButton = () => {
  const { open } = useAppKit()
  const { address: appKitAddress, isConnected: appKitConnected } = useAppKitAccount()
  const { evm } = useSwapWallet()

  const connectedAddress = evm.address ?? appKitAddress
  const isConnected = evm.isConnected || appKitConnected

  const handleClick = useCallback(() => {
    open()
  }, [open])

  if (!isConnected) {
    return (
      <button onClick={handleClick} type='button' className='ssw-connect-btn'>
        <svg
          width='16'
          height='16'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
        >
          <path d='M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1' />
          <path d='M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4' />
        </svg>
        Connect
      </button>
    )
  }

  return (
    <button onClick={handleClick} type='button' className='ssw-connect-btn ssw-connected'>
      {connectedAddress ? truncateAddress(connectedAddress) : 'Connected'}
    </button>
  )
}
