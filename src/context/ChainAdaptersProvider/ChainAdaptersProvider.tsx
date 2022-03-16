import { ChainAdapterManager, UnchainedUrls } from '@shapeshiftoss/chain-adapters'
import React, { createContext, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'

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
  const featureFlags = useSelector(selectFeatureFlags)

  useEffect(() => {
    setChainAdapters(new ChainAdapterManager(unchainedUrls))
  }, [featureFlags, unchainedUrls])

  if (!_chainAdapters) {
    setChainAdapters(new ChainAdapterManager(unchainedUrls))
  }

  return (
    <ChainAdaptersContext.Provider value={_chainAdapters}>{children}</ChainAdaptersContext.Provider>
  )
}

export const useChainAdapters = () => {
  return getChainAdapters()
}
