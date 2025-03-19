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
  selectTxHistoryApiQueries,
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
    // page used directly in callback to avoid closures hell
    const [, setPage] = useState(1)
    const translate = useTranslate()
    const dispatch = useAppDispatch()

    const txHistoryApiQueries = useAppSelector(selectTxHistoryApiQueries)
    const enabledAccountIds = useAppSelector(selectEnabledWalletAccountIds)
    const txHistoryPaginationState = useAppSelector(selectTxHistoryPagination)

    const maybeChainAccountIds = useAppSelector(state =>
      chainId ? selectAccountIdsByChainIdFilter(state, { chainId }) : [],
    )

    const paginationState = useMemo(() => {
      return {
        hasMore: Object.entries(txHistoryPaginationState)
          .filter(([_accountId]) => {
            // No ChainId/AccountId filter, use all AccountIds
            if (!accountId && !chainId) return true
            // Pagination state for the specific AccountId passed (i.e account asset page)
            if (accountId) return _accountId === accountId
            // Pagination state for the specific ChainId passed (i.e asset page)
            if (chainId) return maybeChainAccountIds.includes(_accountId)

            // We shouldn't hit this but...
            return false
          })
          .some(([_, pagination]) => pagination.hasMore),
      }
    }, [txHistoryPaginationState, accountId, chainId, maybeChainAccountIds])

    const accountIds = useMemo(() => {
      if (accountId) {
        return [accountId]
      }
      if (chainId) {
        return maybeChainAccountIds
      }

      return enabledAccountIds
    }, [accountId, chainId, maybeChainAccountIds, enabledAccountIds])

    const accountIdsToFetch = useMemo(() => {
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

    const handleLoadMore = useCallback(() => {
      if (!paginationState.hasMore) return
      setPage(prevPage => {
        const newPage = prevPage + 1
        setPage(prevPage + 1)

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
    }, [accountId, paginationState.hasMore, accountIdsToFetch, dispatch, initialTxsCount])

    const isTxHistoryLoading = useMemo(() => {
      return Object.values(txHistoryApiQueries)
        .filter(query => {
          const args = query?.originalArgs as { accountId?: AccountId } | undefined

          return args?.accountId && accountIds.includes(args.accountId)
        })
        .some(query => {
          if (query?.status === 'pending') return true
        })
    }, [txHistoryApiQueries, accountIds, accountId])

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
            isDisabled={isTxHistoryLoading || !accountIdsToFetch.length}
            isLoading={isTxHistoryLoading}
            rightIcon={
              isTxHistoryLoading ? <CircularProgress isIndeterminate size={6} /> : undefined
            }
          >
            {translate('common.loadMore')}
          </Button>
        )}
      </>
    )
  },
)
