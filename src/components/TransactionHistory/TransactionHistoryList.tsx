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

    const enabledAccountIds = useAppSelector(selectEnabledWalletAccountIds)
    const isAnyTxHistoryApiQueryPending = useAppSelector(selectIsAnyTxHistoryApiQueryPending)
    const _paginationState = useAppSelector(selectTxHistoryPagination)
    const accountIdPaginationState = useAppSelector(state =>
      selectPaginationStateByAccountId(state, { accountId: accountId ?? '' }),
    )

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

      return enabledAccountIds
    }, [accountId, chainId, chainAccountIds, enabledAccountIds])

    const accountPaginationStates = useMemo(
      () =>
        accountIdsToFetch.reduce<TxHistory['pagination']>((acc, _accountId) => {
          const pagination = _paginationState[_accountId]
          acc[_accountId] = pagination
          return acc
        }, {}),
      [_paginationState, accountIdsToFetch],
    )

    const paginationState = useMemo(() => {
      if (accountId) {
        return accountIdPaginationState
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
    }, [_paginationState, accountId, chainId, chainAccountIds, accountIdPaginationState])

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

    const accountsIdsWithMore = useMemo(() => {
      return Object.entries(accountPaginationStates)
        .filter(([_, pagination]) => {
          if (!pagination?.hasMore) return false

          const pageNumbers = Object.keys(pagination.cursors || {}).map(Number)
          const lastPage = Math.max(...pageNumbers, 0)

          const lastCursor = pagination.cursors?.[lastPage]

          if (lastPage > 0 && !lastCursor) return false

          return true
        })
        .map(([_accountId]) => _accountId as AccountId)
    }, [accountPaginationStates])

    const handleLoadMore = useCallback(() => {
      if (accountId && paginationState.hasMore) {
        setPage(page + 1)
        return
      }

      const newPage = page + 1

      // Ensure we do not fetch *all* AccountIds, but only the ones with more pages
      const _accountIdsToFetch = accountsIdsWithMore.filter(_accountId =>
        accountIdsToFetch.includes(_accountId),
      )

      _accountIdsToFetch.forEach(_accountId => {
        dispatch(
          txHistoryApi.endpoints.getAllTxHistory.initiate({
            accountId: _accountId,
            page: newPage,
            pageSize: initialTxsCount,
          }),
        )
      })

      return newPage
    }, [
      accountId,
      paginationState.hasMore,
      accountsIdsWithMore,
      accountIdsToFetch,
      dispatch,
      initialTxsCount,
    ])

    const isLoading = useMemo(() => {
      if (accountId) {
        return isAccountIdFetching
      }
      return isAnyTxHistoryApiQueryPending
    }, [accountId, isAccountIdFetching, isAnyTxHistoryApiQueryPending])

    const showLoadMore = useMemo(() => {
      if (!accountIdsToFetch.length) return false

      if (accountId) return paginationState.hasMore

      const relevantAccountsWithMoreTxs = accountsIdsWithMore.filter(accId =>
        accountIdsToFetch.includes(accId),
      )
      return relevantAccountsWithMoreTxs.length > 0
    }, [accountIdsToFetch, accountId, paginationState.hasMore, accountsIdsWithMore])

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
              accountsIdsWithMore.filter(accId => accountIdsToFetch.includes(accId)).length === 0
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
