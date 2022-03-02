import { CAIP19 } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { TransactionRow } from 'components/Transactions/TransactionRow'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'
import {
  selectAccountIdsByAssetId,
  selectAssetByCAIP19,
  selectTxIdsByFilter
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type TxHistoryProps = {
  assetId: CAIP19
  accountId?: AccountSpecifier
}

export const TxHistory: React.FC<TxHistoryProps> = ({ assetId, accountId }) => {
  const translate = useTranslate()
  const {
    state: { wallet }
  } = useWallet()

  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const chainId = asset.caip2
  const accountIds = useAppSelector(state => selectAccountIdsByAssetId(state, assetId))
  const filter = useMemo(
    // if we are passed an accountId, we're on an asset accoutn page, use that specifically.
    // otherwise, we're on an asset page, use all accountIds related to this asset
    () => ({ assetIds: [assetId], accountIds: accountId ? [accountId] : accountIds }),
    [assetId, accountId, accountIds]
  )

  const walletSupportsChain = useWalletSupportsChain({ chainId, wallet })

  const txIds = useAppSelector(state => selectTxIdsByFilter(state, filter))

  const txRows = useMemo(() => {
    if (!asset.caip19) return null
    return txIds
      ?.map((txId: string) => <TransactionRow key={txId} txId={txId} activeAsset={asset} />)
      .slice(0, 10)
  }, [asset, txIds])

  if (!walletSupportsChain) return null

  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          {translate('assets.assetDetails.assetHistory.recentTransactions')}
        </Card.Heading>
      </Card.Header>
      {txIds?.length ? (
        <Card.Body px={2} pt={0}>
          {txRows}
        </Card.Body>
      ) : (
        <Card.Body>
          <Text color='gray.500' translation='assets.assetDetails.assetHistory.emptyTransactions' />
        </Card.Body>
      )}
    </Card>
  )
}
