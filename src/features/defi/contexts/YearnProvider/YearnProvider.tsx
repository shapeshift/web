import { KnownChainIds } from '@shapeshiftoss/types'
import { getYearnInvestor } from 'features/defi/contexts/YearnProvider/yearnInvestorSingleton'
import type { PropsWithChildren } from 'react'
import React, { useContext, useEffect, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { YearnInvestor } from 'lib/investor/investor-yearn'
import { selectFeatureFlags } from 'state/slices/selectors'
import { store } from 'state/store'

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

  const state = store.getState()
  const { Yearn } = selectFeatureFlags(state)

  useEffect(() => {
    if (!Yearn) {
      setLoading(false)
      return
    }

    ;(async () => {
      try {
        if (!chainAdapterManager.has(KnownChainIds.EthereumMainnet)) return
        setLoading(true)
        const yearnInvestor = getYearnInvestor()
        await yearnInvestor.initialize()
        setYearn(yearnInvestor)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    })()
  }, [Yearn, chainAdapterManager])

  return <YearnContext.Provider value={{ yearn, loading }}>{children}</YearnContext.Provider>
}
