import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { reactQueries } from 'react-queries'
import { useSelector } from 'react-redux'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import {
  useGetZapperAppsBalancesOutputQuery,
  useGetZapperUniV2PoolAssetIdsQuery,
} from 'state/apis/zapper/zapperApi'
import {
  selectPortfolioAccounts,
  selectPortfolioAssetIds,
  selectPortfolioLoadingStatus,
  selectWalletAccountIds,
} from 'state/slices/selectors'
import { useAppDispatch } from 'state/store'

export const useFetchOpportunities = () => {
  const dispatch = useAppDispatch()
  const portfolioLoadingStatus = useSelector(selectPortfolioLoadingStatus)
  const requestedAccountIds = useSelector(selectWalletAccountIds)
  const portfolioAssetIds = useSelector(selectPortfolioAssetIds)
  const portfolioAccounts = useSelector(selectPortfolioAccounts)
  const DynamicLpAssets = useFeatureFlag('DynamicLpAssets')

  const { isLoading: isZapperAppsBalancesOutputLoading } = useGetZapperAppsBalancesOutputQuery()
  const { isLoading: isZapperUniV2PoolAssetIdsLoading } = useGetZapperUniV2PoolAssetIdsQuery(
    undefined,
    { skip: !DynamicLpAssets },
  )

  const { isLoading } = useQuery(
    reactQueries.opportunities.all(
      dispatch,
      requestedAccountIds,
      portfolioAssetIds,
      portfolioAccounts,
      portfolioLoadingStatus,
    ),
  )

  return useMemo(
    () => ({
      isLoading: isLoading || isZapperAppsBalancesOutputLoading || isZapperUniV2PoolAssetIdsLoading,
    }),
    [isLoading, isZapperAppsBalancesOutputLoading, isZapperUniV2PoolAssetIdsLoading],
  )
}
