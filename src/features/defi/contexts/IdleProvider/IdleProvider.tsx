import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { IdleInvestor } from '@shapeshiftoss/investor-idle'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import React, { PropsWithChildren, useContext, useEffect, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { selectFeatureFlags } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type IdleContextProps = {
  loading: boolean
  enabled: boolean
  idle: IdleInvestor | null
}

const IdleContext = React.createContext<IdleContextProps | null>(null)

export const useIdle = () => {
  const context = useContext(IdleContext)
  if (!context) throw new Error("useIdle can't be used outside of the IdleProvider")
  return context
}

export const IdleProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [idle, setIdle] = useState<IdleInvestor | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const chainAdapterManager = getChainAdapterManager()
  const featureFlags = useAppSelector(selectFeatureFlags)
  const enabled = featureFlags.IdleFinance

  useEffect(() => {
    ;(async () => {
      try {
        if (!chainAdapterManager.has(KnownChainIds.EthereumMainnet) || !enabled) return
        setLoading(true)
        const chainAdapter = chainAdapterManager.get(
          KnownChainIds.EthereumMainnet,
        ) as ChainAdapter<KnownChainIds.EthereumMainnet>
        const idleInvestor = new IdleInvestor({
          chainAdapter,
          providerUrl: getConfig().REACT_APP_ETHEREUM_NODE_URL,
        })
        await idleInvestor.initialize()
        setIdle(idleInvestor)
      } catch (error) {
        console.error('IdleManager: error', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [chainAdapterManager, enabled])

  return <IdleContext.Provider value={{ idle, loading, enabled }}>{children}</IdleContext.Provider>
}
