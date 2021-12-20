import { Center } from '@chakra-ui/layout'
import { useMemo } from 'react'
import InfiniteScroll from 'react-infinite-scroller'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { TransactionRow } from 'components/Transactions/TransactionRow'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useInfiniteScroll } from 'hooks/useInfiniteScroll/useInfiniteScroll'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { selectAccountTypesByChain } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectTxIdsByAssetIdAccountType } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'

import { useAsset } from '../Asset'

export const AssetHistory = () => {
  const translate = useTranslate()
  const { asset } = useAsset()

  const {
    state: { wallet }
  } = useWallet()
  wallet?.getFeatures()

  const walletSupportsChain = useWalletSupportsChain({ asset, wallet })
  const accountType = useAppSelector(state => selectAccountTypesByChain(state, asset.chain))

  // TODO(0xdef1cafe): change this to use selectTxIdsByAssetId once we have
  // the account -> address mapping in portfolio locked down
  const txIds = useAppSelector(state =>
    selectTxIdsByAssetIdAccountType(state, asset.caip19, accountType)
  )

  const { next, data, hasMore } = useInfiniteScroll(txIds)

  const txRows = useMemo(() => {
    if (!asset.caip19) return null
    return data?.map((txId: string) => (
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
