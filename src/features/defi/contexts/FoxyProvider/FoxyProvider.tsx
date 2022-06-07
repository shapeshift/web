import { foxyAddresses, FoxyApi } from '@shapeshiftoss/investor-foxy'
import { ChainTypes } from '@shapeshiftoss/types'
import { getConfig as getEthereumConfig } from 'plugins/ethereum/config'
import React, { useContext, useEffect, useState } from 'react'
import { usePlugins } from 'context/PluginProvider/PluginProvider'

type FoxyContextProps = {
  loading: boolean
  foxy: FoxyApi | null
}

const FoxyContext = React.createContext<FoxyContextProps | null>(null)

export const useFoxy = () => {
  const context = useContext(FoxyContext)
  if (!context) throw new Error("useFoxy can't be used outside of the FoxyProvider")
  return context
}

export const FoxyProvider: React.FC = ({ children }) => {
  const [foxy, setFoxy] = useState<FoxyApi | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const { supportedChains, chainAdapterManager } = usePlugins()

  useEffect(() => {
    ;(async () => {
      try {
        if (!supportedChains.includes(ChainTypes.Ethereum)) return
        setLoading(true)
        const api = new FoxyApi({
          adapter: chainAdapterManager.byChain(ChainTypes.Ethereum),
          providerUrl: getEthereumConfig().REACT_APP_ETHEREUM_NODE_URL,
          foxyAddresses,
        })
        setFoxy(api)
      } catch (error) {
        console.error('FoxyManager: error', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [chainAdapterManager, supportedChains])

  return <FoxyContext.Provider value={{ foxy, loading }}>{children}</FoxyContext.Provider>
}
