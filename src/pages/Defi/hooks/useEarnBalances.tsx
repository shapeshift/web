import { useMemo } from 'react'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import type { EarnOpportunityType } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserLpOpportunities,
  selectAggregatedEarnUserStakingOpportunitiesIncludeUndelegations,
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

  const stakingOpportunities = useAppSelector(
    selectAggregatedEarnUserStakingOpportunitiesIncludeUndelegations,
  )

  const lpOpportunities = useAppSelector(selectAggregatedEarnUserLpOpportunities)

  const stakingOpportunitiesFiatBalance = useMemo(
    () =>
      stakingOpportunities.reduce((acc, opportunity) => acc.plus(opportunity.fiatAmount), bn(0)),
    [stakingOpportunities],
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

  const opportunities = useMemo(
    () => [...lpOpportunities, ...stakingOpportunities],
    [lpOpportunities, stakingOpportunities],
  )

  const totalEarningBalance = bnOrZero(stakingOpportunitiesFiatBalance)
    .plus(foxyBalancesData?.totalBalance ?? '0')
    .plus(foxEthLpFiatBalance ?? 0)
    .toString()

  return {
    opportunities,
    totalEarningBalance,
    loading: isFoxyBalancesLoading,
  }
}
