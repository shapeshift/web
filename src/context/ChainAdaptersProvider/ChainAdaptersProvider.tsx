import { ChainAdapterManager, UnchainedUrls } from '@shapeshiftoss/chain-adapters'
import React, { createContext, useContext, useMemo, useRef } from 'react'

type ChainAdaptersProviderProps = {
  children: React.ReactNode
  unchainedUrls: UnchainedUrls
}

type ChainAdaptersContextProps = ChainAdapterManager | null

const ChainAdaptersContext = createContext<ChainAdaptersContextProps>(null)

let _chainAdapters: ChainAdapterManager | null

// expose these so we can use them outside react components as a singleton
export const getChainAdapters = () => {
  if (_chainAdapters) return _chainAdapters
  throw new Error('getChainAdapters: not initialized')
}

const setChainAdapters = (cam: ChainAdapterManager) => {
  _chainAdapters = cam
}

export const ChainAdaptersProvider = ({
  children,
  unchainedUrls
}: ChainAdaptersProviderProps): JSX.Element => {
  setChainAdapters(new ChainAdapterManager(unchainedUrls))
  const chainAdapterManager = useRef<ChainAdapterManager | null>(getChainAdapters())

  const context = useMemo(() => chainAdapterManager.current, [])

  return <ChainAdaptersContext.Provider value={context}>{children}</ChainAdaptersContext.Provider>
}

export const useChainAdapters = () => {
  const context = useContext(ChainAdaptersContext)
  if (!context) throw new Error('Chain Adapters cannot be used outside of its context')
  return context
}
