import { Center } from '@chakra-ui/layout'
import InfiniteScroll from 'react-infinite-scroller'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Card } from 'components/Card/Card'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { TransactionRow } from 'components/Transactions/TransactionRow'
import { AssetMarketData } from 'hooks/useAsset/useAsset'
import { ReduxState } from 'state/reducer'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

import { selectTxHistoryById } from '../helpers/selectTxHistoryById/selectTxHistoryById'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll/useInfiniteScroll'

export const AssetHistory = ({ asset }: { asset: AssetMarketData }) => {
  const translate = useTranslate()
  const { chain, tokenId } = asset
  const txs = useSelector((state: ReduxState) =>
    selectTxHistoryById(state, chain ?? '', tokenId ?? chain)
  )
  const { next, data, hasMore } = useInfiniteScroll(txs)
  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          {translate('assets.assetDetails.assetHistory.transactionHistory')}
        </Card.Heading>
      </Card.Header>
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
          {data?.map((tx: Tx) => (
            <TransactionRow key={`${tx.type}-${tx.txid}-${tx.asset}`} tx={tx} />
          ))}
        </InfiniteScroll>
      </Card.Body>
    </Card>
  )
}
