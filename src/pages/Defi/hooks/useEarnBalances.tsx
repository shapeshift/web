import { cosmosAssetId, osmosisAssetId } from '@shapeshiftoss/caip'
import {
  EarnOpportunityType,
  useNormalizeOpportunities,
} from 'features/defi/helpers/normalizeOpportunity'
import { SerializableOpportunity } from 'features/defi/providers/yearn/components/YearnManager/Deposit/DepositCommon'
import { useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
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
  const vaultArray: SerializableOpportunity[] = useMemo(() => Object.values(vaults), [vaults])
  const { cosmosStakingOpportunities, totalBalance: totalCosmosStakingBalance } =
    useCosmosStakingBalances({
      assetId: cosmosAssetId,
    })
  const {
    cosmosStakingOpportunities: osmosisStakingOpportunities,
    totalBalance: totalOsmosisStakingBalance,
  } = useCosmosStakingBalances({
    assetId: osmosisAssetId,
  })

  const opportunities = useNormalizeOpportunities({
    vaultArray,
    foxyArray,
    cosmosStakingOpportunities: cosmosStakingOpportunities.concat(osmosisStakingOpportunities),
  })
  // When staking, farming, lp, etc are added sum up the balances here
  const totalEarningBalance = bnOrZero(vaultsTotalBalance)
    .plus(totalFoxyBalance)
    .plus(totalCosmosStakingBalance)
    .plus(totalOsmosisStakingBalance)
    .toString()
  return { opportunities, totalEarningBalance, loading: vaultsLoading || foxyLoading }
}
