import { Center, Skeleton } from '@chakra-ui/react'
import { memo } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { TransactionsGroupByDate } from 'components/TransactionHistory/TransactionsGroupByDate'
import { useInfiniteScroll } from 'hooks/useInfiniteScroll/useInfiniteScroll'
import { selectIsAnyTxHistoryApiQueryPending } from 'state/slices/selectors'
import type { TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'

type TransactionHistoryListProps = {
  txIds: TxId[]
  useCompactMode?: boolean
}

const scrollerStyle = { overflow: 'hidden' }

const loader = (
  <Center key={0}>
    <CircularProgress isIndeterminate />
  </Center>
)

export const TransactionHistoryList: React.FC<TransactionHistoryListProps> = memo(
  ({ txIds, useCompactMode = false }) => {
    const { next, data, hasMore } = useInfiniteScroll(txIds)
    const isAnyTxHistoryApiQueryPending = useAppSelector(selectIsAnyTxHistoryApiQueryPending)

    if (isAnyTxHistoryApiQueryPending && !data.length) {
      return (
        <>
          {new Array(2).fill(null).map((_, i) => (
            <Skeleton key={i} height={16} />
          ))}
        </>
      )
    }

    return data.length ? (
      <InfiniteScroll
        dataLength={data.length}
        next={next}
        hasMore={hasMore}
        loader={loader}
        style={scrollerStyle}
      >
        <TransactionsGroupByDate txIds={data} useCompactMode={useCompactMode} />
      </InfiniteScroll>
    ) : (
      <Text
        textAlign='center'
        color='text.subtle'
        translation='assets.assetDetails.assetHistory.emptyTransactions'
      />
    )
  },
)
