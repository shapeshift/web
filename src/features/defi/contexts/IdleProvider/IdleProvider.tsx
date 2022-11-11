import type { PropsWithChildren } from 'react'
import React, { useEffect, useMemo, useState } from 'react'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { logger } from 'lib/logger'

import { getIdleInvestor } from './idleInvestorSingleton'

const moduleLogger = logger.child({ namespace: ['Defi', 'Contexts', 'IdleProvider'] })

type IdleContextProps = {
  loading: boolean
  enabled: boolean
}

export const IdleContext = React.createContext<IdleContextProps | null>(null)

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
