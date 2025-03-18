import { Button } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { Text } from '@/components/Text'
import { TransactionsGroupByDate } from '@/components/TransactionHistory/TransactionsGroupByDate'
import { selectEnabledWalletAccountIds } from '@/state/slices/common-selectors'
import {
  selectIsAnyTxHistoryApiQueryPending,
  selectTxHistoryPagination,
} from '@/state/slices/selectors'
import type { TxId } from '@/state/slices/txHistorySlice/txHistorySlice'
import { txHistoryApi } from '@/state/slices/txHistorySlice/txHistorySlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

type TransactionHistoryListProps = {
  txIds: TxId[]
  useCompactMode?: boolean
  initialTxsCount?: number
  accountId?: AccountId
}

export const TransactionHistoryList: React.FC<TransactionHistoryListProps> = memo(
  ({ txIds, useCompactMode = false, initialTxsCount = 10, accountId }) => {
    const [page, setPage] = useState(1)
    const translate = useTranslate()
    const dispatch = useAppDispatch()

    // Get all account IDs if we're in the global view (no specific accountId)
    const allAccountIds = useAppSelector(selectEnabledWalletAccountIds)
    const isAnyTxHistoryApiQueryPending = useAppSelector(selectIsAnyTxHistoryApiQueryPending)
    const _paginationState = useAppSelector(selectTxHistoryPagination)

    // TODO(gomes): selectPagination and then reduce in-place, this is a Cursor monstrocity while prototyping architecture
    const accountPaginationStates = useMemo(
      () =>
        allAccountIds.reduce(
          (acc, accId) => {
            const pagination = _paginationState[accId] || {
              currentPage: 0,
              totalPages: 0,
              hasMore: true,
              cursors: {},
            }
            acc[accId] = pagination
            return acc
          },
          {} as Record<
            AccountId,
            {
              currentPage: number
              totalPages: number
              hasMore: boolean
              cursors: Record<number, string>
            }
          >,
        ),
      [_paginationState, allAccountIds],
    )

    // TODO(gomes): also leverage selectPagination
    const paginationState = useMemo(() => {
      // TODO(gomes): dis correct?
      if (!accountId) return { hasMore: true, currentPage: 0, totalPages: 0, cursors: {} }
      const pagination = _paginationState[accountId]
      return pagination || { hasMore: true, currentPage: 0, totalPages: 0, cursors: {} }
    }, [_paginationState, accountId])

    // TODO(gomes): and this one too
    const { isFetching } = accountId
      ? txHistoryApi.endpoints.getAllTxHistory.useQuery(
          {
            accountId,
            page,
            pageSize: initialTxsCount,
          },
          {
            // This ensures we refetch when page changes
            refetchOnMountOrArgChange: true,
          },
        )
      : { isFetching: false }

    // Filter to get only account IDs that have more transactions
    // Also ensure that we're not requesting with an empty cursor (which indicates no more txs)
    const accountsWithMoreTxs = useMemo(() => {
      return Object.entries(accountPaginationStates)
        .filter(([_, pagination]) => {
          // Only include accounts that have hasMore=true in state
          if (!pagination.hasMore) return false

          // Find the highest page number that has a cursor
          const pageNumbers = Object.keys(pagination.cursors || {}).map(Number)
          const lastPage = Math.max(...pageNumbers, 0)

          // Get the cursor for the last page
          const lastCursor = pagination.cursors?.[lastPage]

          // If the most recent cursor is empty or undefined, there are no more txs
          if (lastPage > 0 && (lastCursor === undefined || lastCursor === '')) {
            return false
          }

          return true
        })
        .map(([accId]) => accId as AccountId)
    }, [accountPaginationStates])

    const handleLoadMore = useCallback(() => {
      if (accountId) {
        // For single account view, only fetch more if this account has more transactions
        if (paginationState.hasMore) {
          setPage(prevPage => prevPage + 1)
        }
      } else {
        // For global view (no accountId), fetch next page only for accounts that have more transactions
        setPage(prevPage => {
          const newPage = prevPage + 1

          // Only fetch from accounts that have hasMore=true
          if (accountsWithMoreTxs.length > 0) {
            accountsWithMoreTxs.forEach(accId => {
              dispatch(
                txHistoryApi.endpoints.getAllTxHistory.initiate(
                  {
                    accountId: accId,
                    page: newPage,
                    pageSize: initialTxsCount,
                  },
                  {
                    forceRefetch: true,
                  },
                ),
              )
            })
          }

          return newPage
        })
      }
    }, [accountId, paginationState.hasMore, accountsWithMoreTxs, dispatch, initialTxsCount])

    const loadMoreRightIcon = useMemo(
      () =>
        isFetching || isAnyTxHistoryApiQueryPending ? (
          <CircularProgress isIndeterminate size={6} />
        ) : undefined,
      [isFetching, isAnyTxHistoryApiQueryPending],
    )

    // We show the Load More button if at least one account has more transactions
    // or if we're currently loading
    const showLoadMore = useMemo(() => {
      // If no specific account ID is passed and we're not in global view, don't show button
      if (!accountId && !allAccountIds.length) return false

      // If we're fetching, show the button in a disabled (loading) state
      if (isFetching || isAnyTxHistoryApiQueryPending) return true

      // For a specific account view, check if this account has more transactions
      if (accountId) return paginationState.hasMore

      // For global view, show the button if any account has more transactions
      return accountsWithMoreTxs.length > 0
    }, [
      accountId,
      allAccountIds.length,
      paginationState.hasMore,
      accountsWithMoreTxs.length,
      isFetching,
      isAnyTxHistoryApiQueryPending,
    ])

    return (
      <>
        {txIds.length > 0 ? (
          <TransactionsGroupByDate txIds={txIds} useCompactMode={useCompactMode} />
        ) : (
          <Text
            color='text.subtle'
            translation='assets.assetDetails.assetHistory.emptyTransactions'
            fontWeight='normal'
            textAlign='center'
            px='6'
            mb='4'
          />
        )}
        {(txIds.length > 0 || paginationState.hasMore || showLoadMore) && (
          <Button
            mx={2}
            my={2}
            onClick={handleLoadMore}
            isDisabled={isFetching || isAnyTxHistoryApiQueryPending || !accountsWithMoreTxs.length}
            rightIcon={loadMoreRightIcon}
          >
            {translate('common.loadMore')}
          </Button>
        )}
      </>
    )
  },
)
