import { Center } from '@chakra-ui/layout'
import InfiniteScroll from 'react-infinite-scroller'
import { Card } from 'components/Card/Card'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { TransactionsGroupByDate } from 'components/TransactionHistory/TransactionsGroupByDate'
import { useInfiniteScroll } from 'hooks/useInfiniteScroll/useInfiniteScroll'
import { TxId } from 'state/slices/txHistorySlice/txHistorySlice'

type TransactionHistoryListProps = {
  txIds: TxId[]
  useCompactMode?: boolean
}

export const TransactionHistoryList: React.FC<TransactionHistoryListProps> = ({
  txIds,
  useCompactMode = false
}) => {
  const { next, data, hasMore } = useInfiniteScroll(txIds)

  return data?.length ? (
    <Card.Body px={2} pt={0}>
      <InfiniteScroll
        pageStart={0}
        loadMore={next}
        hasMore={hasMore}
        loader={
          <Center key={0}>
            <CircularProgress isIndeterminate />
          </Center>
        }
      >
        <TransactionsGroupByDate txIds={txIds} useCompactMode={useCompactMode} />
      </InfiniteScroll>
    </Card.Body>
  ) : null
}
