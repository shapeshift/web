import { useEffect, useMemo, useState } from 'react'

import { FoxPageContext } from './context'
import { getFarmingApr } from './utils/getFarmingApr'
import { getFoxyApr } from './utils/getFoxyApr'
import { getGovernanceData, ParsedBoardroomGovernanceResult } from './utils/getGovernanceData'
import { getLpApr } from './utils/getLpApr'

export const FoxPageProvider = ({ children }: { children: React.ReactNode }) => {
  const [foxyApr, setFoxyApr] = useState<string | null>(null)
  const [lpApr, setLpApr] = useState<string | null>(null)
  const [farmingApr, setFarmingApr] = useState<string | null>(null)
  const [governanceData, setGovernanceData] = useState<ParsedBoardroomGovernanceResult[] | null>(
    null,
  )

  useEffect(() => {
    Promise.all([getFoxyApr(), getLpApr(), getFarmingApr(), getGovernanceData()]).then(
      ([foxyApr, lpApr, farmingApr, governanceData]) => {
        setFoxyApr(foxyApr)
        setLpApr(lpApr)
        setFarmingApr(farmingApr)
        setGovernanceData(governanceData)
      },
    )
  }, [])

  const value = useMemo(
    () => ({
      foxyApr,
      lpApr,
      farmingApr,
      governanceData,
    }),
    [foxyApr, lpApr, farmingApr, governanceData],
  )
  return <FoxPageContext.Provider value={value}>{children}</FoxPageContext.Provider>
}
