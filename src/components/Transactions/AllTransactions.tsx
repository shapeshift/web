import { Center } from '@chakra-ui/layout'
import { CAIP19 } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import InfiniteScroll from 'react-infinite-scroller'
import { Card } from 'components/Card/Card'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { TransactionRow } from 'components/Transactions/TransactionRow'
import { useInfiniteScroll } from 'hooks/useInfiniteScroll/useInfiniteScroll'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import {
  selectAccountIdsByAssetId,
  selectAssetByCAIP19,
  selectTxIdsByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetTransactionProps = {
  assetId: CAIP19
  accountId?: AccountSpecifier
}

export const AllTransactions: React.FC<AssetTransactionProps> = ({ assetId, accountId }) => {
  const {
    state: { wallet },
  } = useWallet()
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const chainId = asset.caip2
  const accountIds = useAppSelector(state => selectAccountIdsByAssetId(state, assetId))
  const filter = useMemo(
    // if we are passed an accountId, we're on an asset accoutn page, use that specifically.
    // otherwise, we're on an asset page, use all accountIds related to this asset
    () => ({ assetIds: [assetId], accountIds: accountId ? [accountId] : accountIds }),
    [assetId, accountId, accountIds],
  )

  const walletSupportsChain = useWalletSupportsChain({ chainId, wallet })

  const txIds = useAppSelector(state => selectTxIdsByFilter(state, filter))

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
      {data?.length ? (
        <Card.Body px={2}>
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
      ) : (
        <Card.Body>
          <Text
            textAlign='center'
            color='gray.500'
            translation='assets.assetDetails.assetHistory.emptyTransactions'
          />
        </Card.Body>
      )}
    </Card>
  )
}
