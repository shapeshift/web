import type { PropsWithChildren } from 'react'
import React, { useEffect, useMemo, useState } from 'react'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { logger } from 'lib/logger'

import { getOsmosisInvestor } from './osmosisInvestorSingleton'

const moduleLogger = logger.child({ namespace: ['Defi', 'Contexts', 'OsmosisProvider'] })

type OsmosisContextProps = {
  loading: boolean
  enabled: boolean
}

export const OsmosisContext = React.createContext<OsmosisContextProps | null>(null)

export const OsmosisProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [loading, setLoading] = useState<boolean>(false)
  const isOsmosisEnabled = useFeatureFlag('OsmosisLP')

  useEffect(() => {
    ;(async () => {
      try {
        if (!isOsmosisEnabled) return
        setLoading(true)

        const investor = getOsmosisInvestor()
        if (!investor) throw new Error('No Investor')

        await investor.initialize()
      } catch (error) {
        moduleLogger.error(error, 'OsmosisProvider:useEffect error')
      } finally {
        setLoading(false)
      }
    })()
  }, [isOsmosisEnabled])

  const value: OsmosisContextProps = useMemo(
    () => ({ loading, enabled: isOsmosisEnabled }),
    [isOsmosisEnabled, loading],
  )

  return <OsmosisContext.Provider value={value}>{children}</OsmosisContext.Provider>
}
