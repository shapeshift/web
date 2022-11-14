import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { TransactionHistoryList } from 'components/TransactionHistory/TransactionHistoryList'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { selectAssetById, selectTxIdsByFilter } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetTransactionHistoryProps = {
  assetId: AssetId
  accountId?: AccountId
  useCompactMode?: boolean
  limit?: number
}

export const AssetTransactionHistory: React.FC<AssetTransactionHistoryProps> = ({
  assetId,
  accountId,
  useCompactMode = false,
  limit,
}) => {
  const translate = useTranslate()
  const {
    state: { wallet },
  } = useWallet()

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const chainId = asset.chainId
  const filter = useMemo(() => ({ assetId, accountId }), [assetId, accountId])
  const walletSupportsChain = useWalletSupportsChain({ chainId, wallet })
  const txIds = useAppSelector(state => selectTxIdsByFilter(state, filter))

  if (!walletSupportsChain) return null

  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          {translate(
            useCompactMode
              ? 'transactionHistory.recentTransactions'
              : 'transactionHistory.transactionHistory',
          )}
        </Card.Heading>
      </Card.Header>
      <TransactionHistoryList
        txIds={limit ? txIds.slice(0, limit) : txIds}
        useCompactMode={useCompactMode}
      />
    </Card>
  )
}
