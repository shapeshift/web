import { Center } from '@chakra-ui/layout'
import { useMemo } from 'react'
import InfiniteScroll from 'react-infinite-scroller'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Card } from 'components/Card/Card'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { TransactionRow } from 'components/Transactions/TransactionRow'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { ReduxState } from 'state/reducer'
import { selectTxIdsByFilter } from 'state/slices/txHistorySlice/txHistorySlice'

import { useAsset } from '../Asset'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll/useInfiniteScroll'

export const AssetHistory = () => {
  const translate = useTranslate()
  const { asset } = useAsset()

  const {
    state: { wallet }
  } = useWallet()
  wallet?.getFeatures()

  const walletSupportsChain = useWalletSupportsChain({ asset, wallet })
  const accountType = useSelector(
    (state: ReduxState) => state.preferences.accountTypes[asset.chain]
  )
  const txIds = useSelector((state: ReduxState) =>
    selectTxIdsByFilter(state, { accountType, caip19: asset.caip19 })
  )

  const { next, data, hasMore } = useInfiniteScroll(txIds)

  const txRows = useMemo(() => {
    if (!asset.caip19) return null
    return data?.map((txId: string, i) => (
      <TransactionRow key={txId} txId={txId} activeAsset={asset} />
    ))
  }, [asset, data])

  if (!walletSupportsChain) return null

  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          {translate('assets.assetDetails.assetHistory.transactionHistory')}
        </Card.Heading>
      </Card.Header>
      {data?.length ? (
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
            {txRows}
          </InfiniteScroll>
        </Card.Body>
      ) : null}
    </Card>
  )
}
