import {
  EarnOpportunityType,
  useNormalizeOpportunities,
} from 'features/defi/helpers/normalizeOpportunity'
import { useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { SupportedYearnVault } from 'lib/transformYearnOpportunities'
import { useCosmosStakingBalances } from 'pages/Defi/hooks/useCosmosStakingBalances'

import { useFoxyBalances } from './useFoxyBalances'
import { useVaultBalances } from './useVaultBalances'

export type UseEarnBalancesReturn = {
  opportunities: EarnOpportunityType[]
  totalEarningBalance: string
  loading: boolean
}

export function useEarnBalances(): UseEarnBalancesReturn {
  const {
    opportunities: foxyArray,
    totalBalance: totalFoxyBalance,
    loading: foxyLoading,
  } = useFoxyBalances()
  const { vaults, totalBalance: vaultsTotalBalance, loading: vaultsLoading } = useVaultBalances()
  const vaultArray: SupportedYearnVault[] = useMemo(() => Object.values(vaults), [vaults])
  const { cosmosStakingOpportunities, totalBalance: totalCosmosStakingBalance } =
    useCosmosStakingBalances({
      assetId: 'cosmos:cosmoshub-4/slip44:118',
    })

  // cosmosStakingOpportunities intentionally set to empty array => we do not need to display staking opportunities with no staking amount
  const opportunities = useNormalizeOpportunities({
    vaultArray,
    foxyArray,
    cosmosStakingOpportunities,
  })
  // When staking, farming, lp, etc are added sum up the balances here
  const totalEarningBalance = bnOrZero(vaultsTotalBalance)
    .plus(totalFoxyBalance)
    .plus(totalCosmosStakingBalance)
    .toString()
  return { opportunities, totalEarningBalance, loading: vaultsLoading || foxyLoading }
}
