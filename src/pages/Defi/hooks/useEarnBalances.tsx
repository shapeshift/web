import { SupportedYearnVault } from '@shapeshiftoss/investor-yearn'
import {
  EarnOpportunityType,
  useNormalizeOpportunities
} from 'features/defi/helpers/normalizeOpportunity'
import { useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectFeatureFlag } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useFoxyBalances } from './useFoxyBalances'
import { useVaultBalances } from './useVaultBalances'

export type UseEarnBalancesReturn = {
  opportunities: EarnOpportunityType[]
  totalEarningBalance: string
  loading: boolean
}

export function useEarnBalances(): UseEarnBalancesReturn {
  const foxyInvestorFeatureFlag = useAppSelector(state => selectFeatureFlag(state, 'FoxyInvestor'))
  const {
    opportunities: foxies,
    totalBalance: totalFoxyBalance,
    loading: foxyLoading
  } = useFoxyBalances()
  const foxyArray = foxyInvestorFeatureFlag ? foxies : []
  const { vaults, totalBalance: vaultsTotalBalance, loading: vaultsLoading } = useVaultBalances()
  const vaultArray: SupportedYearnVault[] = useMemo(() => {
    return vaults.vaults ? Object.values(vaults.vaults) : []
  }, [vaults])
  const opportunities = useNormalizeOpportunities({
    vaultArray,
    foxyArray
  })
  // When staking, farming, lp, etc are added sum up the balances here
  const totalEarningBalance = bnOrZero(vaultsTotalBalance).plus(totalFoxyBalance).toString()
  return { opportunities, totalEarningBalance, loading: vaultsLoading || foxyLoading }
}
