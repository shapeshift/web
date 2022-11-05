import type { IdleInvestor } from '@keepkey/investor-idle'
import type { PropsWithChildren } from 'react'
import React, { useContext, useEffect, useState } from 'react'
import { logger } from 'lib/logger'
import { selectFeatureFlags } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { getIdleInvestor } from './idleInvestorSingleton'

const moduleLogger = logger.child({ namespace: ['Defi', 'Contexts', 'IdleProvider'] })

type IdleContextProps = {
  loading: boolean
  enabled: boolean
  idleInvestor: IdleInvestor | null
}

const IdleContext = React.createContext<IdleContextProps | null>(null)

export const useIdle = () => {
  const context = useContext(IdleContext)
  if (!context) throw new Error("useIdle can't be used outside of the IdleProvider")
  return context
}

export const IdleProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [idleInvestor, setIdle] = useState<IdleInvestor | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const featureFlags = useAppSelector(selectFeatureFlags)
  const isIdleEnabled = featureFlags.IdleFinance

  useEffect(() => {
    ;(async () => {
      try {
        if (!isIdleEnabled) return
        setLoading(true)

        const investor = getIdleInvestor()
        if (!investor) throw new Error('No Investor')

        await investor.initialize()
        setIdle(investor)
      } catch (error) {
        moduleLogger.error(error, 'IdleProvider:useEffect error')
      } finally {
        setLoading(false)
      }
    })()
  }, [isIdleEnabled])

  return (
    <IdleContext.Provider value={{ idleInvestor, loading, enabled: isIdleEnabled }}>
      {children}
    </IdleContext.Provider>
  )
}
