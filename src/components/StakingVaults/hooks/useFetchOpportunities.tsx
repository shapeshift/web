import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'

import { knownChainIds } from '@/constants/chains'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { reactQueries } from '@/react-queries'
import {
  useGetPortalsAppsBalancesOutputQuery,
  useGetPortalsUniV2PoolAssetIdsQuery,
} from '@/state/apis/portals/portalsApi'
import {
  selectEnabledWalletAccountIds,
  selectEvmAccountIds,
  selectIsAnyTxHistoryApiQueryPending,
  selectPortfolioAccounts,
  selectPortfolioAssetIds,
  selectPortfolioLoadingStatus,
} from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useFetchOpportunities = () => {
  const {
    state: { isConnected },
  } = useWallet()
  const dispatch = useAppDispatch()
  const portfolioLoadingStatus = useSelector(selectPortfolioLoadingStatus)
  const requestedAccountIds = useSelector(selectEnabledWalletAccountIds)
  const evmAccountIds = useSelector(selectEvmAccountIds)
  const portfolioAssetIds = useSelector(selectPortfolioAssetIds)
  const portfolioAccounts = useSelector(selectPortfolioAccounts)
  const isAnyTxHistoryApiQueryPending = useAppSelector(selectIsAnyTxHistoryApiQueryPending)

  const { isLoading: isPortalsAppsBalancesOutputLoading } = useGetPortalsAppsBalancesOutputQuery(
    { evmAccountIds },
    {
      skip: !evmAccountIds.length,
      refetchOnMountOrArgChange: true,
    },
  )
  const { isLoading: isPortalsUniV2PoolAssetIdsLoading } =
    useGetPortalsUniV2PoolAssetIdsQuery(undefined)

  const { isLoading } = useQuery({
    ...reactQueries.opportunities.all(
      dispatch,
      requestedAccountIds,
      portfolioAssetIds,
      portfolioAccounts,
      knownChainIds,
    ),
    enabled:
      // Only fetch if we're connected, not currently loading (this one is weird as we may be going back and forth between loading and idle)
      // *and* as a last resort *if* we're not fetching Tx history, which is a bit of a hack, but it's a last resort to avoid blocking the main thread
      Boolean(
        portfolioLoadingStatus !== 'loading' &&
          requestedAccountIds.length &&
          !isAnyTxHistoryApiQueryPending,
      ),
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
        isPortalsAppsBalancesOutputLoading ||
        isPortalsUniV2PoolAssetIdsLoading,
    }),
    [
      isLoading,
      isPortalsAppsBalancesOutputLoading,
      isPortalsUniV2PoolAssetIdsLoading,
      portfolioLoadingStatus,
    ],
  )

  return result
}
