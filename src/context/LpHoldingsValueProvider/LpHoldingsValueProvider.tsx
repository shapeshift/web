import React, { createContext, useContext, useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useFoxEthLpBalances } from 'pages/Defi/hooks/useFoxEthLpBalances'
import { useFoxFarmingBalances } from 'pages/Defi/hooks/useFoxFarmingBalances'
import { selectFeatureFlags } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type LpHoldingsValueProviderProps = {
  children: React.ReactNode
}

type ILpHoldingsValueContext = {
  totalBalance: string
}

const LpHoldingsValueContext = createContext<ILpHoldingsValueContext>({
  totalBalance: '0',
})

export const LpHoldingsValueProvider = ({
  children,
}: LpHoldingsValueProviderProps): JSX.Element => {
  const { opportunity: foxEthLpOpportunity } = useFoxEthLpBalances()
  const { totalBalance: foxFarmingTotalBalance } = useFoxFarmingBalances()
  const featureFlags = useAppSelector(selectFeatureFlags)
  const value = useMemo(() => {
    return {
      totalBalance: bnOrZero(featureFlags.FoxLP ? foxEthLpOpportunity.fiatAmount : 0)
        .plus(featureFlags.FoxFarming ? foxFarmingTotalBalance : 0)
        .toString(),
    }
  }, [
    featureFlags.FoxFarming,
    featureFlags.FoxLP,
    foxEthLpOpportunity.fiatAmount,
    foxFarmingTotalBalance,
  ])

  return <LpHoldingsValueContext.Provider value={value}>{children}</LpHoldingsValueContext.Provider>
}

export const useLpHoldingsValue = () => useContext(LpHoldingsValueContext)
