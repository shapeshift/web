import { useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import {
  selectEarnBalancesFiatAmountFull,
  selectPortfolioFiatBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type UseEarnBalancesReturn = {
  totalEarningBalance: string
  loading: boolean
}

export function useEarnBalances(): UseEarnBalancesReturn {
  const stakingOpportunitiesFiatBalance = useAppSelector(selectEarnBalancesFiatAmountFull)

  const lpAssetBalanceFilter = useMemo(
    () => ({
      assetId: foxEthLpAssetId,
    }),
    [],
  )

  const foxEthLpFiatBalance = useAppSelector(state =>
    selectPortfolioFiatBalanceByAssetId(state, lpAssetBalanceFilter),
  )

  const totalEarningBalance = bnOrZero(stakingOpportunitiesFiatBalance)
    .plus(foxEthLpFiatBalance ?? 0)
    .toString()

  return {
    totalEarningBalance,
    loading: false,
  }
}
