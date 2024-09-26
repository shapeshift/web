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
  selectEnabledWalletAccountIds,
  selectEvmAccountIds,
  selectPortfolioAccounts,
  selectPortfolioAssetIds,
  selectPortfolioLoadingStatus,
} from 'state/slices/selectors'
import { useAppDispatch } from 'state/store'

export const useFetchOpportunities = () => {
  const dispatch = useAppDispatch()
  const portfolioLoadingStatus = useSelector(selectPortfolioLoadingStatus)
  const requestedAccountIds = useSelector(selectEnabledWalletAccountIds)
  const evmAccountIds = useSelector(selectEvmAccountIds)
  const portfolioAssetIds = useSelector(selectPortfolioAssetIds)
  const portfolioAccounts = useSelector(selectPortfolioAccounts)
  const DynamicLpAssets = useFeatureFlag('DynamicLpAssets')

  const { isLoading: isZapperAppsBalancesOutputLoading } = useGetZapperAppsBalancesOutputQuery(
    { evmAccountIds },
    {
      skip: !evmAccountIds.length,
      refetchOnMountOrArgChange: true,
    },
  )
  const { isLoading: isZapperUniV2PoolAssetIdsLoading } = useGetZapperUniV2PoolAssetIdsQuery(
    undefined,
    { skip: !DynamicLpAssets },
  )

  const { isLoading } = useQuery({
    ...reactQueries.opportunities.all(
      dispatch,
      requestedAccountIds,
      portfolioAssetIds,
      portfolioAccounts,
    ),
    enabled: Boolean(portfolioLoadingStatus !== 'loading' && requestedAccountIds.length),
    staleTime: Infinity,
    // Note the default gcTime of react-query below. Doesn't need to be explicit, but given how bug-prone this is, leaving  here as explicit so it
    // can be easily updated if needed
    gcTime: 60 * 1000 * 5,
  })

  const result = useMemo(
    () => ({
      isLoading:
        isLoading ||
        portfolioLoadingStatus === 'loading' ||
        isZapperAppsBalancesOutputLoading ||
        isZapperUniV2PoolAssetIdsLoading,
    }),
    [
      isLoading,
      isZapperAppsBalancesOutputLoading,
      isZapperUniV2PoolAssetIdsLoading,
      portfolioLoadingStatus,
    ],
  )

  return result
}
