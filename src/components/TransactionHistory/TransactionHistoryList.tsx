import { Button } from '@chakra-ui/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { Text } from '@/components/Text'
import { TransactionsGroupByDate } from '@/components/TransactionHistory/TransactionsGroupByDate'
import { selectEnabledWalletAccountIds } from '@/state/slices/common-selectors'
import {
  selectAccountIdsByChainIdFilter,
  selectIsAnyTxHistoryApiQueryPending,
  selectTxHistoryPagination,
} from '@/state/slices/selectors'
import type { TxHistory, TxId } from '@/state/slices/txHistorySlice/txHistorySlice'
import { txHistoryApi } from '@/state/slices/txHistorySlice/txHistorySlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

type TransactionHistoryListProps = {
  txIds: TxId[]
  useCompactMode?: boolean
  initialTxsCount?: number
  accountId?: AccountId
  chainId?: ChainId
}

export const TransactionHistoryList: React.FC<TransactionHistoryListProps> = memo(
  ({ txIds, useCompactMode = false, initialTxsCount = 10, accountId, chainId }) => {
    const [page, setPage] = useState(1)
    const translate = useTranslate()
    const dispatch = useAppDispatch()

    // Get all account IDs if we're in the global view (no specific accountId)
    const allAccountIds = useAppSelector(selectEnabledWalletAccountIds)
    const isAnyTxHistoryApiQueryPending = useAppSelector(selectIsAnyTxHistoryApiQueryPending)
    const _paginationState = useAppSelector(selectTxHistoryPagination)

    const chainAccountIds = useAppSelector(state =>
      chainId ? selectAccountIdsByChainIdFilter(state, { chainId }) : [],
    )

    const accountIdsToFetch = useMemo(() => {
      if (accountId) {
        return [accountId]
      }
      if (chainId) {
        return chainAccountIds
      }

      return allAccountIds
    }, [accountId, chainId, chainAccountIds, allAccountIds])

    // TODO(gomes): selectPagination and then reduce in-place, this is a Cursor monstrocity while prototyping architecture
    const accountPaginationStates = useMemo(
      () =>
        accountIdsToFetch.reduce<TxHistory['pagination']>((acc, _accountId) => {
          const pagination = _paginationState[_accountId]
          acc[_accountId] = pagination
          return acc
        }, {}),
      [_paginationState, accountIdsToFetch],
    )

    // Get effective pagination state - different logic depending on whether we're viewing
    // an account, a chain, or global
    const paginationState = useMemo(() => {
      if (accountId) {
        const pagination = _paginationState[accountId]
        return pagination
      }

      if (chainId && chainAccountIds.length > 0) {
        const isAnyChainAccountIdHasMore = chainAccountIds.some(
          accId => _paginationState[accId]?.hasMore,
        )
        return {
          hasMore: isAnyChainAccountIdHasMore,
        }
      }

      return { hasMore: true }
    }, [_paginationState, accountId, chainId, chainAccountIds, page])

    // Query for transactions when we have a specific accountId
    const { isFetching: isAccountIdFetching } = accountId
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
          if (!pagination?.hasMore) return false

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
        .map(([_accountId]) => _accountId as AccountId)
    }, [accountPaginationStates])

    const handleLoadMore = useCallback(() => {
      if (accountId && paginationState.hasMore) {
        setPage(prevPage => prevPage + 1)
      }

      setPage(prevPage => {
        const newPage = prevPage + 1

        // Get accounts to load more from (intersection of accounts with more txs and relevant accounts)
        const accountsToLoadFrom = accountsWithMoreTxs.filter(accId =>
          accountIdsToFetch.includes(accId),
        )

        // Only fetch from accounts that have hasMore=true
        if (accountsToLoadFrom.length > 0) {
          accountsToLoadFrom.forEach(accId => {
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
    }, [
      accountId,
      paginationState.hasMore,
      accountsWithMoreTxs,
      accountIdsToFetch,
      dispatch,
      initialTxsCount,
    ])

    // Determine the correct loading state based on whether we're in account-specific, chain-specific, or global mode
    const isLoading = useMemo(() => {
      // If we have a specific accountId, use its loading state
      if (accountId) {
        return isAccountIdFetching
      }
      // Otherwise use the global loading state
      return isAnyTxHistoryApiQueryPending
    }, [accountId, isAccountIdFetching, isAnyTxHistoryApiQueryPending])

    // We show the Load More button if at least one relevant account has more transactions
    // or if we're currently loading
    const showLoadMore = useMemo(() => {
      // If no accounts available for the specified criteria, don't show button
      if (accountIdsToFetch.length === 0) return false

      // If we're loading, show the button in a disabled (loading) state
      if (isLoading) return true

      // For a specific account view, check if this account has more transactions
      if (accountId) return paginationState.hasMore

      // For chain or global view, show the button if any relevant account has more transactions
      const relevantAccountsWithMoreTxs = accountsWithMoreTxs.filter(accId =>
        accountIdsToFetch.includes(accId),
      )
      return relevantAccountsWithMoreTxs.length > 0
    }, [accountIdsToFetch, accountId, paginationState.hasMore, accountsWithMoreTxs, isLoading])

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
            isDisabled={
              isLoading ||
              accountsWithMoreTxs.filter(accId => accountIdsToFetch.includes(accId)).length === 0
            }
            isLoading={isLoading}
            rightIcon={isLoading ? <CircularProgress isIndeterminate size={6} /> : undefined}
          >
            {translate('common.loadMore')}
          </Button>
        )}
      </>
    )
  },
)
