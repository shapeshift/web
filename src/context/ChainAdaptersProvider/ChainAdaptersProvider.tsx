import { ChainAdapterManager, UnchainedUrls } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import React, { createContext } from 'react'

export const defaultUnchainedUrls: UnchainedUrls = {
  [ChainTypes.Ethereum]: {
    httpUrl: getConfig().REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL,
    wsUrl: getConfig().REACT_APP_UNCHAINED_ETHEREUM_WS_URL
  },
  [ChainTypes.Bitcoin]: {
    httpUrl: getConfig().REACT_APP_UNCHAINED_BITCOIN_HTTP_URL,
    wsUrl: getConfig().REACT_APP_UNCHAINED_BITCOIN_WS_URL
  }
}

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
  if (!_chainAdapters) setChainAdapters(new ChainAdapterManager(defaultUnchainedUrls))

  return (
    <ChainAdaptersContext.Provider value={_chainAdapters}>{children}</ChainAdaptersContext.Provider>
  )
}

export const useChainAdapters = () => getChainAdapters()
