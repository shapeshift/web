import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { WalletClient } from 'viem'
import type { Config } from 'wagmi'
import { useWalletClient, WagmiProvider } from 'wagmi'

import { getWagmiAdapter, initializeAppKit } from '../config/appkit'
import { truncateAddress } from '../types'

const queryClient = new QueryClient()

type InternalWalletProviderProps = {
  projectId: string
  children: (walletClient: WalletClient | undefined) => ReactNode
}

const InternalWalletContent = ({
  children,
}: {
  children: (walletClient: WalletClient | undefined) => ReactNode
}) => {
  const { data: walletClient } = useWalletClient()
  return <>{children(walletClient)}</>
}

export const InternalWalletProvider = ({ projectId, children }: InternalWalletProviderProps) => {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    initializeAppKit(projectId)
    setIsInitialized(true)
  }, [projectId])

  const wagmiConfig = useMemo((): Config | undefined => {
    if (!isInitialized) return undefined
    const adapter = getWagmiAdapter()
    return adapter?.wagmiConfig
  }, [isInitialized])

  if (!wagmiConfig) {
    return null
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <InternalWalletContent>{children}</InternalWalletContent>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export const ConnectWalletButton = () => {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()

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
      {address ? truncateAddress(address) : 'Connected'}
    </button>
  )
}
