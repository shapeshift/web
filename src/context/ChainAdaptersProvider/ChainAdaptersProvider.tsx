import { ChainAdapterManager, UnchainedUrls } from '@shapeshiftoss/chain-adapters'
import React, { createContext, useContext, useEffect, useRef } from 'react'

type ChainAdaptersProviderProps = {
  children: React.ReactNode
  unchainedUrls: UnchainedUrls
}

type ChainAdaptersContextProps = ChainAdapterManager | null

const ChainAdaptersContext = createContext<ChainAdaptersContextProps>(null)

export const ChainAdaptersProvider = ({
  children,
  unchainedUrls
}: ChainAdaptersProviderProps): JSX.Element => {
  const chainAdapterManager = useRef<ChainAdapterManager | null>(
    new ChainAdapterManager(unchainedUrls)
  )

  useEffect(() => {
    chainAdapterManager.current = new ChainAdapterManager(unchainedUrls)
    return () => {
      chainAdapterManager.current = null
    }
  }, [unchainedUrls])

  return (
    <ChainAdaptersContext.Provider value={chainAdapterManager.current}>
      {children}
    </ChainAdaptersContext.Provider>
  )
}

export const useChainAdapters = () => {
  const context = useContext(ChainAdaptersContext)
  if (!context) throw new Error('Chain Adapters cannot be used outside of its context')
  return context
}
