import { useAppKit } from '@reown/appkit/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import type { Config } from 'wagmi'
import { WagmiProvider } from 'wagmi'

import { getActiveWagmiConfig, initializeAppKit, isAppKitInitialized } from '../config/appkit'
import { useSwapWallet } from '../contexts/SwapWalletContext'
import { truncateAddress } from '../types'

const queryClient = new QueryClient()

type AppKitWalletProviderProps = {
  projectId?: string
  children: ReactNode
}

export const AppKitWalletProvider = ({ projectId, children }: AppKitWalletProviderProps) => {
  // Seed from the SDK singleton so a host-initialized AppKit is picked up on the
  // first render (no flash of null) when it was created before the widget mounts.
  const [wagmiConfig, setWagmiConfig] = useState<Config | undefined>(() =>
    isAppKitInitialized() ? getActiveWagmiConfig() : undefined,
  )

  useEffect(() => {
    // Self-init only when no AppKit exists yet. If the host already called
    // createAppKit, we hook into that shared instance rather than creating a second.
    if (projectId && !isAppKitInitialized()) initializeAppKit(projectId)
    if (isAppKitInitialized()) setWagmiConfig(getActiveWagmiConfig())
  }, [projectId])

  if (!wagmiConfig) return null

  // We always own the WagmiProvider / QueryClient — built from the wagmi config we
  // read off the shared AppKit singleton (whether self-init or host-owned). This is
  // what lets a host integrate by calling createAppKit() alone, wrapping nothing.
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

export const ConnectWalletButton = () => {
  const { open } = useAppKit()

  const { walletSendAddress } = useSwapWallet()

  const handleClick = useCallback(() => {
    open()
  }, [open])

  if (!walletSendAddress) {
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
      {truncateAddress(walletSendAddress)}
    </button>
  )
}
