import { Card, CardBody, useMediaQuery } from '@chakra-ui/react'
import { useIsFetching } from '@tanstack/react-query'
import { memo, useCallback, useEffect, useState, useTransition } from 'react'

import { AccountTable } from './components/AccountList/AccountTable'
import { AccountTableSkeleton } from './components/AccountTableSkeleton'

import { PullToRefreshList } from '@/components/PullToRefresh/PullToRefreshList'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { selectEnabledWalletAccountIds } from '@/state/slices/common-selectors'
import { portfolioApi } from '@/state/slices/portfolioSlice/portfolioSlice'
import { selectIsAnyPortfolioGetAccountLoading } from '@/state/slices/portfolioSlice/selectors'
import { txHistoryApi } from '@/state/slices/txHistorySlice/txHistorySlice'
import { useAppDispatch, useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

export const Portfolio = memo(() => {
  const [, startTransition] = useTransition()
  const [shouldRenderAccountTable, setShouldRenderAccountTable] = useState(false)
  const [isMobile] = useMediaQuery(`(max-width: ${breakpoints['md']})`, { ssr: false })

  const dispatch = useAppDispatch()
  const enabledWalletAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const isLazyTxHistoryEnabled = useFeatureFlag('LazyTxHistory')

  const getAccountFetching = useIsFetching({ queryKey: ['getAccount'] })
  const portalsAccountFetching = useIsFetching({ queryKey: ['portalsAccount'] })
  const portalsPlatformsFetching = useIsFetching({ queryKey: ['portalsPlatforms'] })
  const isPortfolioLoading = useAppSelector(selectIsAnyPortfolioGetAccountLoading)

  const isRefreshing =
    getAccountFetching > 0 ||
    portalsAccountFetching > 0 ||
    portalsPlatformsFetching > 0 ||
    isPortfolioLoading

  useEffect(() => {
    startTransition(() => {
      setShouldRenderAccountTable(true)
    })
  }, [])

  const handleRefresh = useCallback(async () => {
    dispatch(portfolioApi.util.resetApiState())
    dispatch(txHistoryApi.util.resetApiState())

    const { getAllTxHistory } = txHistoryApi.endpoints

    enabledWalletAccountIds.forEach(accountId => {
      dispatch(portfolioApi.endpoints.getAccount.initiate({ accountId, upsertOnFetch: true }))
    })

    if (isLazyTxHistoryEnabled) return

    enabledWalletAccountIds.forEach(requestedAccountId => {
      dispatch(getAllTxHistory.initiate(requestedAccountId))
    })
  }, [dispatch, enabledWalletAccountIds, isLazyTxHistoryEnabled])

  const content = shouldRenderAccountTable ? <AccountTable /> : <AccountTableSkeleton />

  if (!isMobile) {
    return (
      <Card variant='dashboard'>
        <CardBody px={2} pt={0} pb={0}>
          {content}
        </CardBody>
      </Card>
    )
  }

  return (
    <Card variant='dashboard'>
      <CardBody px={2} pt={0} pb={0}>
        <PullToRefreshList onRefresh={handleRefresh} isRefreshing={isRefreshing}>
          {content}
        </PullToRefreshList>
      </CardBody>
    </Card>
  )
})
