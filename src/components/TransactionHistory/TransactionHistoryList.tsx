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
  selectPaginationStateByAccountId,
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
  chainId?: ChainId
}

export const TransactionHistoryList: React.FC<TransactionHistoryListProps> = memo(
  ({ txIds, useCompactMode = false, initialTxsCount = 10, accountId, chainId }) => {
    const [page, setPage] = useState(1)
    const translate = useTranslate()
    const dispatch = useAppDispatch()

    const enabledAccountIds = useAppSelector(selectEnabledWalletAccountIds)
    const isAnyTxHistoryApiQueryPending = useAppSelector(selectIsAnyTxHistoryApiQueryPending)
    const txHistoryPaginationState = useAppSelector(selectTxHistoryPagination)
    const accountIdPaginationState = useAppSelector(state =>
      selectPaginationStateByAccountId(state, { accountId: accountId ?? '' }),
    )

    const chainAccountIds = useAppSelector(state =>
      chainId ? selectAccountIdsByChainIdFilter(state, { chainId }) : [],
    )

    const paginationState = useMemo(() => {
      if (accountId) {
        return accountIdPaginationState
      }

      if (chainId && chainAccountIds.length > 0) {
        const isAnyChainAccountIdHasMore = chainAccountIds.some(
          accId => txHistoryPaginationState[accId]?.hasMore,
        )
        return {
          hasMore: isAnyChainAccountIdHasMore,
        }
      }

      return {
        hasMore: Object.values(txHistoryPaginationState).some(pagination => pagination.hasMore),
      }
    }, [txHistoryPaginationState, accountId, chainId, chainAccountIds, accountIdPaginationState])

    const accountIds = useMemo(() => {
      if (accountId) {
        return [accountId]
      }
      if (chainId) {
        return chainAccountIds
      }

      return enabledAccountIds
    }, [accountId, chainId, chainAccountIds, enabledAccountIds])

    // Query for transactions when we have a specific accountId
    const { isFetching: isAccountIdFetching } = accountId
      ? txHistoryApi.endpoints.getAllTxHistory.useQuery(
          {
            accountId,
            page,
            pageSize: initialTxsCount,
          },
          {
            refetchOnMountOrArgChange: true,
          },
        )
      : { isFetching: false }

    // Filter to get only account IDs that have more transactions
    // Also ensure that we're not requesting with an empty cursor (which indicates no more txs)
    const accountsIdsWithMore = useMemo(() => {
      return accountIds.filter(_accountId => {
        const pagination = txHistoryPaginationState[_accountId]

        // Only include accounts that have hasMore=true in state
        if (!pagination?.hasMore) return false

        // Find the highest page number that has a cursor
        const pageNumbers = Object.keys(pagination?.cursors || {}).map(Number)
        const lastPage = Math.max(...pageNumbers, 0)

        // Get the cursor for the last page
        const lastCursor = pagination?.cursors?.[lastPage]

        // If the most recent cursor is empty or undefined, there are no more txs
        if (lastPage > 0 && (lastCursor === undefined || lastCursor === '')) {
          return false
        }

        return true
      })
    }, [txHistoryPaginationState, accountIds])

    // Ensure we do not fetch *all* AccountIds, but only the ones with more pages
    const accountIdsToFetch = useMemo(
      () => accountsIdsWithMore.filter(_accountId => accountIds.includes(_accountId)),
      [accountsIdsWithMore, accountIds],
    )

    const handleLoadMore = useCallback(() => {
      if (accountId && paginationState.hasMore) {
        setPage(prevPage => prevPage + 1)
      }

      setPage(prevPage => {
        const newPage = prevPage + 1

        accountIdsToFetch.forEach(_accountId => {
          dispatch(
            txHistoryApi.endpoints.getAllTxHistory.initiate({
              accountId: _accountId,
              page: newPage,
              pageSize: initialTxsCount,
            }),
          )
        })

        return newPage
      })
    }, [
      accountId,
      paginationState.hasMore,
      accountsIdsWithMore,
      accountIds,
      dispatch,
      initialTxsCount,
    ])

    const isLoading = useMemo(() => {
      if (accountId) {
        return isAccountIdFetching
      }
      return isAnyTxHistoryApiQueryPending
    }, [accountId, isAccountIdFetching, isAnyTxHistoryApiQueryPending])

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
        {(txIds.length > 0 || paginationState.hasMore) && (
          <Button
            mx={2}
            my={2}
            onClick={handleLoadMore}
            isDisabled={isLoading || !accountIdsToFetch.length}
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
