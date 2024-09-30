import type { CardProps } from '@chakra-ui/react'
import { Button, Card, CardHeader, Heading } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import { memo } from 'react'
import { useTranslate } from 'react-polyglot'
import { NavLink } from 'react-router-dom'
import { Text } from 'components/Text'
import { TransactionHistoryList } from 'components/TransactionHistory/TransactionHistoryList'
import { selectTxIdsByFilter } from 'state/slices/selectors'
import type { TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'

type RecentTransactionFilter = {
  acccountId?: AccountId
  assetId?: AssetId
  txStatus?: TxStatus
  isRfoxTx?: boolean
}
type RecentTransactionProps = {
  limit?: number
  viewMoreLink?: boolean
  filter: RecentTransactionFilter
} & Omit<CardProps, 'filter'>

type RecentTransactionsBodyProps = {
  limit: number
} & (
  | {
      txIds: TxId[]
      filter?: never
    }
  | {
      txIds?: never
      filter: RecentTransactionFilter
    }
)

const defaultFilter = {}

export const RecentTransactionsBody: React.FC<RecentTransactionsBodyProps> = ({
  txIds: _txIds,
  filter,
  limit,
}) => {
  const txIds = useAppSelector(state => (_txIds ? _txIds : selectTxIdsByFilter(state, filter)))
  return <TransactionHistoryList txIds={txIds} useCompactMode={true} initialTxsCount={limit} />
}

export const RecentTransactions: React.FC<RecentTransactionProps> = memo(
  ({ limit = 10, viewMoreLink, filter = defaultFilter, ...rest }) => {
    const txIds = useAppSelector(state => selectTxIdsByFilter(state, filter))
    const translate = useTranslate()
    return (
      <Card variant='dashboard' {...rest}>
        <CardHeader display='flex' justifyContent='space-between' alignItems='center' mb={4}>
          <Heading as='h5'>
            <Text translation={'dashboard.recentTransactions.recentTransactions'} />
          </Heading>
          {viewMoreLink && (
            <Button as={NavLink} to='/wallet/activity' variant='link' size='sm' colorScheme='blue'>
              {translate('common.viewAll')}
            </Button>
          )}
        </CardHeader>
        <RecentTransactionsBody txIds={txIds} limit={limit} />
      </Card>
    )
  },
)
