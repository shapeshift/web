import { Center } from '@chakra-ui/layout'
import InfiniteScroll from 'react-infinite-scroller'
import { Card } from 'components/Card/Card'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { TransactionsGroupByDate } from 'components/TransactionHistory/TransactionsGroupByDate'
import { useInfiniteScroll } from 'hooks/useInfiniteScroll/useInfiniteScroll'
import { selectTxHistoryStatus } from 'state/slices/selectors'
import type { TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'

import { TransactionsLoading } from './TransactionsLoading'

type TransactionHistoryListProps = {
  txIds: TxId[]
  useCompactMode?: boolean
}

export const TransactionHistoryList: React.FC<TransactionHistoryListProps> = ({
  txIds,
  useCompactMode = false,
}) => {
  const { next, data, hasMore } = useInfiniteScroll(txIds)
  const txHistoryStatus = useAppSelector(selectTxHistoryStatus)

  if (txHistoryStatus === 'loading' && !data.length) return <TransactionsLoading />

  return data.length ? (
    <Card.Body px={0} pt={0}>
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
        {txHistoryStatus === 'loading' && <TransactionsLoading count={1} />}
        <TransactionsGroupByDate txIds={txIds} useCompactMode={useCompactMode} />
      </InfiniteScroll>
    </Card.Body>
  ) : (
    <Card.Body>
      <Text
        textAlign='center'
        color='gray.500'
        translation='assets.assetDetails.assetHistory.emptyTransactions'
      />
    </Card.Body>
  )
}
