import { Box, Button, Spinner } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { Text } from '@/components/Text'
import { TransactionsGroupByDate } from '@/components/TransactionHistory/TransactionsGroupByDate'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll/useInfiniteScroll'
import { selectIsAnyTxHistoryApiQueryPending } from '@/state/slices/selectors'
import type { TxId } from '@/state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from '@/state/store'

type TransactionHistoryListProps = {
  txIds: TxId[]
  useCompactMode?: boolean
  initialTxsCount?: number
}

export const TransactionHistoryList: React.FC<TransactionHistoryListProps> = memo(
  ({ txIds, useCompactMode = false, initialTxsCount }) => {
    const { next, data, hasMore } = useInfiniteScroll({
      array: txIds,
      initialTxsCount,
    })
    const isAnyTxHistoryApiQueryPending = useAppSelector(selectIsAnyTxHistoryApiQueryPending)
    const translate = useTranslate()

    const loadMoreRightIcon = useMemo(
      () =>
        !hasMore && isAnyTxHistoryApiQueryPending ? (
          <CircularProgress isIndeterminate size={6} />
        ) : undefined,
      [hasMore, isAnyTxHistoryApiQueryPending],
    )

    const isInitialPending = useMemo(() => {
      return txIds.length && !data.length
    }, [data.length, txIds])

    if (isInitialPending)
      return (
        <Box position='relative' p={4} textAlign='center'>
          <Spinner size='xl' color='blue.500' thickness='4px' />
        </Box>
      )

    if (!data.length)
      return (
        <Text
          color='text.subtle'
          translation='assets.assetDetails.assetHistory.emptyTransactions'
          fontWeight='normal'
          textAlign='center'
          px='6'
          mb='4'
        />
      )

    return (
      <>
        <TransactionsGroupByDate txIds={data} useCompactMode={useCompactMode} />
        <Button mx={2} my={2} onClick={next} isDisabled={!hasMore} rightIcon={loadMoreRightIcon}>
          {translate('common.loadMore')}
        </Button>
      </>
    )
  },
)
