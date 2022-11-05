import type { ChainAdapter } from '@keepkey/chain-adapters'
import type { YearnInvestor } from '@keepkey/investor-yearn'
import { KnownChainIds } from '@keepkey/types'
import type { PropsWithChildren } from 'react'
import React, { useContext, useEffect, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { logger } from 'lib/logger'
import { getYearnInvestor } from 'lib/yearnInvestorSingleton'
const moduleLogger = logger.child({ namespace: ['YearnProvider'] })

type YearnContextProps = {
  loading: boolean
  yearn: YearnInvestor | null
}

const YearnContext = React.createContext<YearnContextProps | null>(null)

export const useYearn = () => {
  const context = useContext(YearnContext)
  if (!context) throw new Error("useYearn can't be used outside of the YearnProvider")
  return context
}

export const YearnProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [yearn, setYearn] = useState<YearnInvestor | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const chainAdapterManager = getChainAdapterManager()

  useEffect(() => {
    ;(async () => {
      try {
        if (!chainAdapterManager.has(KnownChainIds.EthereumMainnet)) return
        setLoading(true)
        const chainAdapter = chainAdapterManager.get(
          KnownChainIds.EthereumMainnet,
        ) as ChainAdapter<KnownChainIds.EthereumMainnet>
        const yearnInvestor = getYearnInvestor(chainAdapter)
        await yearnInvestor.initialize()
        setYearn(yearnInvestor)
      } catch (error) {
        moduleLogger.error(error, 'YearnManager: error')
      } finally {
        setLoading(false)
      }
    })()
  }, [chainAdapterManager])

  return <YearnContext.Provider value={{ yearn, loading }}>{children}</YearnContext.Provider>
}
