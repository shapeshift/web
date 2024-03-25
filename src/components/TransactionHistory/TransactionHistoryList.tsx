import { ChevronDownIcon } from '@chakra-ui/icons'
import { Button } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { TransactionsGroupByDate } from 'components/TransactionHistory/TransactionsGroupByDate'
import { useInfiniteScroll } from 'hooks/useInfiniteScroll/useInfiniteScroll'
import { selectIsAnyTxHistoryApiQueryPending } from 'state/slices/selectors'
import { type TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'

type TransactionHistoryListProps = {
  txIds: TxId[]
  useCompactMode?: boolean
  initialTxsCount?: number
}

export const TransactionHistoryList: React.FC<TransactionHistoryListProps> = memo(
  ({ txIds, useCompactMode = false, initialTxsCount }) => {
    const { next, data, hasMore } = useInfiniteScroll(txIds, initialTxsCount)
    const isAnyTxHistoryApiQueryPending = useAppSelector(selectIsAnyTxHistoryApiQueryPending)
    const translate = useTranslate()

    const loadMoreRightIcon = useMemo(
      () =>
        !hasMore && isAnyTxHistoryApiQueryPending ? (
          <CircularProgress isIndeterminate size={6} />
        ) : (
          <ChevronDownIcon />
        ),
      [hasMore, isAnyTxHistoryApiQueryPending],
    )

    return (
      <>
        {data.length > 0 && (
          <TransactionsGroupByDate txIds={data} useCompactMode={useCompactMode} />
        )}
        <Button mx={2} onClick={next} isDisabled={!hasMore} rightIcon={loadMoreRightIcon}>
          {data.length
            ? translate('common.loadMore')
            : translate('assets.assetDetails.assetHistory.emptyTransactions')}
        </Button>
      </>
    )
  },
)
