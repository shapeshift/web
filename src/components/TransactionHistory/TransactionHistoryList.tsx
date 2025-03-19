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
    const [page, setPage] = useState(1)
    const translate = useTranslate()
    const dispatch = useAppDispatch()

    const txHistoryApiQueries = useAppSelector(selectTxHistoryApiQueries)
    const enabledAccountIds = useAppSelector(selectEnabledWalletAccountIds)
    const txHistoryPaginationState = useAppSelector(selectTxHistoryPagination)

    const maybeChainAccountIds = useAppSelector(state =>
      chainId ? selectAccountIdsByChainIdFilter(state, { chainId }) : [],
    )

    const accountIds = useMemo(() => {
      if (accountId) {
        return [accountId]
      }
      if (chainId) {
        return maybeChainAccountIds
      }

      return enabledAccountIds
    }, [accountId, chainId, maybeChainAccountIds, enabledAccountIds])

    const hasMore = useMemo(
      () =>
        Object.entries(txHistoryPaginationState)
          .filter(([_accountId]) => accountIds.includes(_accountId))
          .some(([_, pagination]) => pagination.hasMore),
      [txHistoryPaginationState, accountId, chainId, maybeChainAccountIds],
    )

    const accountIdsToFetch = useMemo(
      () =>
        accountIds.filter(_accountId => {
          const pagination = txHistoryPaginationState[_accountId]

          if (!pagination?.hasMore) return false

          const pageNumbers = Object.keys(pagination?.cursors || {}).map(Number)
          const lastPage = Math.max(...pageNumbers, 0)

          const lastCursor = pagination?.cursors?.[lastPage]

          if (lastPage && !lastCursor) {
            return false
          }

          return true
        }),
      [txHistoryPaginationState, accountIds],
    )

    const handleLoadMore = useCallback(() => {
      if (!hasMore) return

      const newPage = page + 1
      setPage(newPage)

      accountIdsToFetch.forEach(_accountId => {
        dispatch(
          txHistoryApi.endpoints.getAllTxHistory.initiate({
            accountId: _accountId,
            page: newPage,
            pageSize: initialTxsCount,
          }),
        )
      })
    }, [accountIdsToFetch, dispatch, initialTxsCount, page, hasMore])

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
        {(txIds.length > 0 || hasMore) && (
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
