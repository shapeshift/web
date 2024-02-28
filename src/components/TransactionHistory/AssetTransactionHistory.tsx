import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Card, CardHeader, Heading } from '@chakra-ui/react'
import { type AccountId, type AssetId, type ChainId, fromAccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useLocation } from 'react-router'
import { NavLink } from 'react-router-dom'
import { TransactionHistoryList } from 'components/TransactionHistory/TransactionHistoryList'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { selectAssetById, selectTxIdsByFilter } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetTransactionHistoryProps = {
  assetId?: AssetId
  accountId?: AccountId
  useCompactMode?: boolean
  limit?: number
}

const arrowForwardIcon = <ArrowForwardIcon />

export const AssetTransactionHistory: React.FC<AssetTransactionHistoryProps> = ({
  assetId,
  accountId,
  useCompactMode = false,
  limit,
}) => {
  const translate = useTranslate()
  const location = useLocation()
  const wallet = useWallet().state.wallet
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  const chainId: ChainId = (() => {
    if (asset) return asset.chainId
    if (accountId) return fromAccountId(accountId).chainId
    return ''
  })()

  const walletSupportsChain = useWalletSupportsChain(chainId, wallet)

  const filter = useMemo(() => ({ assetId, accountId }), [assetId, accountId])
  const txIds = useAppSelector(state => selectTxIdsByFilter(state, filter))

  if (!chainId || !walletSupportsChain) return null

  return (
    <Card variant='dashboard'>
      <CardHeader display='flex' justifyContent='space-between' alignItems='center' mb={4}>
        <Heading as='h5'>
          {translate(
            useCompactMode
              ? 'transactionHistory.recentTransactions'
              : 'transactionHistory.transactionHistory',
          )}
        </Heading>
        {limit && txIds.length > limit && (
          <Button
            variant='link'
            size='sm'
            colorScheme='blue'
            as={NavLink}
            to={`${location.pathname}/transactions`}
            rightIcon={arrowForwardIcon}
          >
            {translate('common.seeAll')}
          </Button>
        )}
      </CardHeader>
      <TransactionHistoryList
        txIds={limit ? txIds.slice(0, limit) : txIds}
        useCompactMode={useCompactMode}
      />
    </Card>
  )
}
