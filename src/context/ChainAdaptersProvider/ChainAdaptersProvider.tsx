import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import React, { createContext } from 'react'

type ChainAdaptersProviderProps = {
  children: React.ReactNode
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

export const ChainAdaptersProvider = ({ children }: ChainAdaptersProviderProps): JSX.Element => {
  if (!_chainAdapters) setChainAdapters(new ChainAdapterManager({}))

  return (
    <ChainAdaptersContext.Provider value={_chainAdapters}>{children}</ChainAdaptersContext.Provider>
  )
}

export const useChainAdapters = () => getChainAdapters()
