import { CardBody, Center } from '@chakra-ui/react'
import { memo } from 'react'
import InfiniteScroll from 'react-infinite-scroller'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { TransactionsGroupByDate } from 'components/TransactionHistory/TransactionsGroupByDate'
import { useInfiniteScroll } from 'hooks/useInfiniteScroll/useInfiniteScroll'
import type { TxId } from 'state/slices/txHistorySlice/txHistorySlice'

type TransactionHistoryListProps = {
  txIds: TxId[]
  useCompactMode?: boolean
}

export const TransactionHistoryList: React.FC<TransactionHistoryListProps> = memo(
  ({ txIds, useCompactMode = false }) => {
    const { next, data, hasMore } = useInfiniteScroll(txIds)

    return data.length ? (
      <CardBody px={0} pt={0}>
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
      </CardBody>
    ) : (
      <CardBody>
        <Text
          textAlign='center'
          color='text.subtle'
          translation='assets.assetDetails.assetHistory.emptyTransactions'
        />
      </CardBody>
    )
  },
)
