import type { FoxyApi } from '@keepkey/investor-foxy'
import type { PropsWithChildren } from 'react'
import React, { useContext, useEffect, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { logger } from 'lib/logger'
import { getFoxyApi } from 'state/apis/foxy/foxyApiSingleton'

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
        setLoading(true)
        const api = getFoxyApi()
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
