import type { AccountId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'

import { knownChainIds } from '@/constants/chains'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { reactQueries } from '@/react-queries'
import { useGetPortalsUniV2PoolAssetIdsQuery } from '@/state/apis/portals/portalsApi'
import {
  selectEnabledWalletAccountIds,
  selectPortfolioAccounts,
  selectPortfolioAssetIds,
  selectPortfolioLoadingStatus,
} from '@/state/slices/selectors'
import { useAppDispatch } from '@/state/store'

export const useFetchOpportunities = () => {
  const {
    state: { isConnected },
  } = useWallet()
  const dispatch = useAppDispatch()
  const portfolioLoadingStatus = useSelector(selectPortfolioLoadingStatus)
  const requestedAccountIds = useSelector(selectEnabledWalletAccountIds)
  const portfolioAssetIds = useSelector(selectPortfolioAssetIds)
  const portfolioAccounts = useSelector(selectPortfolioAccounts)

  const [opportunityAccountIdsFetched, setOpportunityAccountIdsFetched] = useState<
    Record<string, true>
  >({})

  const onAccountLoad = useCallback(
    (accountId: AccountId): void =>
      setOpportunityAccountIdsFetched(prev => ({ ...prev, [accountId]: true })),
    [],
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
      onAccountLoad,
    ),
    enabled:
      !isConnected || Boolean(portfolioLoadingStatus !== 'loading' && requestedAccountIds.length),
    staleTime: Infinity,
    // Note the default gcTime of react-query below. Doesn't need to be explicit, but given how bug-prone this is, leaving  here as explicit so it
    // can be easily updated if needed
    gcTime: 60 * 1000 * 5,
  })

  const result = useMemo(
    () => ({
      isLoading:
        isLoading || portfolioLoadingStatus === 'loading' || isPortalsUniV2PoolAssetIdsLoading,
      opportunityAccountIdsFetched: Object.keys(opportunityAccountIdsFetched),
    }),
    [
      isLoading,
      isPortalsUniV2PoolAssetIdsLoading,
      portfolioLoadingStatus,
      opportunityAccountIdsFetched,
    ],
  )

  return result
}
