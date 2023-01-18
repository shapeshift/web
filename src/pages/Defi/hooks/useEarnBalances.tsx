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

export type UseEarnBalancesReturn = {
  opportunities: EarnOpportunityType[]
  totalEarningBalance: string
  loading: boolean
}

export function useEarnBalances(): UseEarnBalancesReturn {
  const { isLoading: isFoxyBalancesLoading, data: foxyBalancesData } = useFoxyBalances()
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

  const opportunities = useNormalizeOpportunities({
    cosmosSdkStakingOpportunities: cosmosSdkStakingOpportunities.concat(
      osmosisStakingOpportunities,
    ),
    foxEthLpOpportunity,
    stakingOpportunities,
  })

  // When staking, farming, lp, etc are added sum up the balances here
  const totalEarningBalance = bnOrZero(farmContractsFiatBalance)
    .plus(foxyBalancesData?.totalBalance ?? '0')
    .plus(totalCosmosStakingBalance)
    .plus(totalOsmosisStakingBalance)
    .plus(foxEthLpFiatBalance ?? 0)
    .toString()

  return {
    opportunities,
    totalEarningBalance,
    loading: isFoxyBalancesLoading,
  }
}
