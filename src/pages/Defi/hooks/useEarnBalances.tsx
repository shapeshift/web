import { SupportedYearnVault } from '@shapeshiftoss/investor-yearn'
import {
  EarnOpportunityType,
  useNormalizeOpportunities,
} from 'features/defi/helpers/normalizeOpportunity'
import { useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useCosmosStakingBalances } from 'pages/Defi/hooks/useCosmosStakingBalances'
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
  const cosmosInvestorFlag = useAppSelector(state => selectFeatureFlag(state, 'CosmosInvestor'))
  const {
    opportunities: foxies,
    totalBalance: totalFoxyBalance,
    loading: foxyLoading,
  } = useFoxyBalances()
  const foxyArray = foxyInvestorFeatureFlag ? foxies : []
  const { vaults, totalBalance: vaultsTotalBalance, loading: vaultsLoading } = useVaultBalances()
  const vaultArray: SupportedYearnVault[] = useMemo(() => Object.values(vaults), [vaults])
  const { activeStakingOpportunities, totalBalance } = useCosmosStakingBalances({
    assetId: 'cosmos:cosmoshub-4/slip44:118',
  })

  const cosmosActiveStakingOpportunities = cosmosInvestorFlag ? activeStakingOpportunities : []
  const totalCosmosStakingBalance = cosmosInvestorFlag ? totalBalance : bnOrZero(0)

  // cosmosStakingOpportunities intentionally set to empty array => we do not need to display staking opportunities with no staking amount
  const opportunities = useNormalizeOpportunities({
    vaultArray,
    foxyArray,
    cosmosActiveStakingOpportunities: cosmosActiveStakingOpportunities,
    cosmosStakingOpportunities: [],
  })
  // When staking, farming, lp, etc are added sum up the balances here
  const totalEarningBalance = bnOrZero(vaultsTotalBalance)
    .plus(totalFoxyBalance)
    .plus(totalCosmosStakingBalance)
    .toString()
  return { opportunities, totalEarningBalance, loading: vaultsLoading || foxyLoading }
}
