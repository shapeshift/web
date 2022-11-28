import { cosmosAssetId, osmosisAssetId } from '@shapeshiftoss/caip'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import { useNormalizeOpportunities } from 'features/defi/helpers/normalizeOpportunity'
import { useMemo } from 'react'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { useCosmosSdkStakingBalances } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import {
  selectAggregatedEarnUserLpOpportunity,
  selectAggregatedEarnUserStakingOpportunities,
  selectPortfolioFiatBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useFoxyBalances } from './useFoxyBalances'
import type { MergedEarnVault } from './useVaultBalances'
import { useVaultBalances } from './useVaultBalances'

export type UseEarnBalancesReturn = {
  opportunities: EarnOpportunityType[]
  totalEarningBalance: string
  loading: boolean
}

export type SerializableOpportunity = MergedEarnVault

export function useEarnBalances(): UseEarnBalancesReturn {
  const { isLoading: isFoxyBalancesLoading, data: foxyBalancesData } = useFoxyBalances()
  const { vaults, totalBalance: vaultsTotalBalance, loading: vaultsLoading } = useVaultBalances()
  const vaultArray: SerializableOpportunity[] = useMemo(() => Object.values(vaults), [vaults])
  const { cosmosSdkStakingOpportunities, totalBalance: totalCosmosStakingBalance } =
    useCosmosSdkStakingBalances({
      assetId: cosmosAssetId,
    })
  const {
    cosmosSdkStakingOpportunities: osmosisStakingOpportunities,
    totalBalance: totalOsmosisStakingBalance,
  } = useCosmosSdkStakingBalances({
    assetId: osmosisAssetId,
  })

  const stakingOpportunities = useAppSelector(selectAggregatedEarnUserStakingOpportunities)

  const foxEthLpOpportunity = useAppSelector(state =>
    selectAggregatedEarnUserLpOpportunity(state, {
      lpId: foxEthLpAssetId,
      assetId: foxEthLpAssetId,
    }),
  )

  const stakingContractsAggregatedOpportunities = useAppSelector(
    selectAggregatedEarnUserStakingOpportunities,
  )

  const farmContractsFiatBalance = useMemo(
    () =>
      stakingContractsAggregatedOpportunities.reduce(
        (acc, opportunity) => acc.plus(opportunity.fiatAmount),
        bn(0),
      ),
    [stakingContractsAggregatedOpportunities],
  )

  const lpAssetBalanceFilter = useMemo(
    () => ({
      assetId: foxEthLpAssetId,
    }),
    [],
  )
  const foxEthLpFiatBalance = useAppSelector(state =>
    selectPortfolioFiatBalanceByAssetId(state, lpAssetBalanceFilter),
  )

  console.log({ foxyBalancesData })
  const opportunities = useNormalizeOpportunities({
    vaultArray,
    foxyArray: foxyBalancesData?.opportunities || [],
    cosmosSdkStakingOpportunities: cosmosSdkStakingOpportunities.concat(
      osmosisStakingOpportunities,
    ),
    foxEthLpOpportunity,
    stakingOpportunities,
  })

  // When staking, farming, lp, etc are added sum up the balances here
  const totalEarningBalance = bnOrZero(vaultsTotalBalance)
    .plus(foxyBalancesData?.totalBalance ?? '0')
    .plus(totalCosmosStakingBalance)
    .plus(totalOsmosisStakingBalance)
    .plus(farmContractsFiatBalance)
    .plus(foxEthLpFiatBalance ?? 0)
    .toString()

  return {
    opportunities,
    totalEarningBalance,
    loading: vaultsLoading || isFoxyBalancesLoading,
  }
}
