import { Flex, Stack, useMediaQuery } from '@chakra-ui/react'
import { useIsFetching } from '@tanstack/react-query'
import { memo, useCallback, useMemo, useRef } from 'react'

import { TransactionHistoryList } from '@/components/TransactionHistory/TransactionHistoryList'
import { PullToRefreshList } from '@/components/PullToRefresh/PullToRefreshList'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { isSome } from '@/lib/utils'
import { DownloadButton } from '@/pages/TransactionHistory/DownloadButton'
import { useFilters } from '@/pages/TransactionHistory/hooks/useFilters'
import { useSearch } from '@/pages/TransactionHistory/hooks/useSearch'
import { TransactionHistoryFilter } from '@/pages/TransactionHistory/TransactionHistoryFilter'
import { TransactionHistorySearch } from '@/pages/TransactionHistory/TransactionHistorySearch'
import { selectIsAnyPortfolioGetAccountLoading } from '@/state/slices/portfolioSlice/selectors'
import { portfolioApi } from '@/state/slices/portfolioSlice/portfolioSlice'
import { selectTxIdsBasedOnSearchTermAndFilters } from '@/state/slices/selectors'
import { txHistoryApi } from '@/state/slices/txHistorySlice/txHistorySlice'
import { deserializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { useAppDispatch, useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

type TransactionHistoryContentProps = {
  isCompact?: boolean
}

export const TransactionHistoryContent = memo(
  ({ isCompact = false }: TransactionHistoryContentProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null)
    const { searchTerm, matchingAssets, handleInputChange } = useSearch()
    const { filters, setFilters, resetFilters } = useFilters()
    const [isMobile] = useMediaQuery(`(max-width: ${breakpoints['md']})`, { ssr: false })
    const dispatch = useAppDispatch()
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

    const selectorFilters = useMemo(
      () => ({
        matchingAssets: matchingAssets?.map(asset => asset.assetId) ?? null,
        ...filters,
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [searchTerm, filters],
    )

    const txIds = useAppSelector(state =>
      selectTxIdsBasedOnSearchTermAndFilters(state, selectorFilters),
    )

    const visibleAccountIds = useMemo(() => {
      const accountIdsSet = new Set<string>()
      txIds.forEach(txId => {
        const { accountId } = deserializeTxIndex(txId)
        accountIdsSet.add(accountId)
      })
      return Array.from(accountIdsSet)
    }, [txIds])

    const handleRefresh = useCallback(async () => {
      dispatch(portfolioApi.util.resetApiState())
      dispatch(txHistoryApi.util.resetApiState())

      const { getAllTxHistory } = txHistoryApi.endpoints

      visibleAccountIds.forEach(accountId => {
        dispatch(portfolioApi.endpoints.getAccount.initiate({ accountId, upsertOnFetch: true }))
      })

      if (isLazyTxHistoryEnabled) return

      visibleAccountIds.forEach(requestedAccountId => {
        dispatch(getAllTxHistory.initiate(requestedAccountId))
      })
    }, [dispatch, visibleAccountIds, isLazyTxHistoryEnabled])

    const handleReset = useCallback(() => {
      resetFilters()
      if (inputRef?.current?.value) {
        inputRef.current.value = ''
        handleInputChange('')
      }
    }, [handleInputChange, resetFilters])

    const headingPadding = isCompact ? 4 : [2, 3, 6]
    const stackMargin = isCompact ? 0 : { base: 0, xl: -4, '2xl': -6 }

    const content = (
      <Stack mx={stackMargin}>
        <Flex width='full' justifyContent='space-between' p={headingPadding}>
          <Flex>
            <TransactionHistorySearch
              ref={inputRef}
              isCompact={isCompact}
              handleInputChange={handleInputChange}
            />
            <TransactionHistoryFilter
              resetFilters={handleReset}
              setFilters={setFilters}
              hasAppliedFilter={!!Object.values(filters).filter(isSome).length}
              isCompact={isCompact}
            />
          </Flex>
          <DownloadButton txIds={txIds} isCompact={isCompact} />
        </Flex>
        <TransactionHistoryList txIds={txIds} useCompactMode={isCompact} />
      </Stack>
    )

    if (!isMobile) {
      return content
    }

    return (
      <PullToRefreshList onRefresh={handleRefresh} isRefreshing={isRefreshing}>
        {content}
      </PullToRefreshList>
    )
  },
)
