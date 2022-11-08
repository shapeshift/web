import type { PropsWithChildren } from 'react'
import { useMemo } from 'react'
import React, { useContext, useEffect, useState } from 'react'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { logger } from 'lib/logger'

import { getIdleInvestor } from './idleInvestorSingleton'

const moduleLogger = logger.child({ namespace: ['Defi', 'Contexts', 'IdleProvider'] })

type IdleContextProps = {
  loading: boolean
  enabled: boolean
}

const IdleContext = React.createContext<IdleContextProps | null>(null)

export const useIdle = () => {
  const context = useContext(IdleContext)
  if (!context) throw new Error("useIdle can't be used outside of the IdleProvider")
  return context
}

export const IdleProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [loading, setLoading] = useState<boolean>(false)
  const isIdleEnabled = useFeatureFlag('IdleFinance')

  useEffect(() => {
    ;(async () => {
      try {
        if (!isIdleEnabled) return
        setLoading(true)

        const investor = getIdleInvestor()
        if (!investor) throw new Error('No Investor')

        await investor.initialize()
      } catch (error) {
        moduleLogger.error(error, 'IdleProvider:useEffect error')
      } finally {
        setLoading(false)
      }
    })()
  }, [isIdleEnabled])

  const value: IdleContextProps = useMemo(
    () => ({ loading, enabled: isIdleEnabled }),
    [isIdleEnabled, loading],
  )

  return <IdleContext.Provider value={value}>{children}</IdleContext.Provider>
}
