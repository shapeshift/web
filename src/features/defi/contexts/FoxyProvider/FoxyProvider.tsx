import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { foxyAddresses, FoxyApi } from '@shapeshiftoss/investor-foxy'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import React, { PropsWithChildren, useContext, useEffect, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { logger } from 'lib/logger'
const moduleLogger = logger.child({ namespace: ['FoxyProvider'] })

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

export const FoxyProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [foxy, setFoxy] = useState<FoxyApi | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const chainAdapterManager = getChainAdapterManager()

  useEffect(() => {
    ;(async () => {
      try {
        if (!chainAdapterManager.has(KnownChainIds.EthereumMainnet)) return
        setLoading(true)
        const api = new FoxyApi({
          adapter: chainAdapterManager.get(
            KnownChainIds.EthereumMainnet,
          ) as ChainAdapter<KnownChainIds.EthereumMainnet>,
          providerUrl: getConfig().REACT_APP_ETHEREUM_NODE_URL,
          foxyAddresses,
        })
        setFoxy(api)
      } catch (error) {
        moduleLogger.error(error, 'FoxyManager: error')
      } finally {
        setLoading(false)
      }
    })()
  }, [chainAdapterManager])

  return <FoxyContext.Provider value={{ foxy, loading }}>{children}</FoxyContext.Provider>
}
