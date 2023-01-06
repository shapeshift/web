import { Button } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { NavLink } from 'react-router-dom'
import type { CardProps } from 'components/Card/Card'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { TransactionHistoryList } from 'components/TransactionHistory/TransactionHistoryList'
import type { ReduxState } from 'state/reducer'
import { selectLastNTxIds } from 'state/slices/selectors'

type RecentTransactionProps = { limit?: number; viewMoreLink?: boolean } & CardProps

export const RecentTransactions: React.FC<RecentTransactionProps> = ({
  limit = 10,
  viewMoreLink,
  ...rest
}) => {
  const recentTxIds = useSelector((state: ReduxState) => selectLastNTxIds(state, limit))
  const translate = useTranslate()
  return (
    <Card {...rest}>
      <Card.Header display='flex' justifyContent='space-between' alignItems='center'>
        <Card.Heading>
          <Text translation={'dashboard.recentTransactions.recentTransactions'} />
        </Card.Heading>
        {viewMoreLink && (
          <Button
            as={NavLink}
            to='/transaction-history'
            variant='link'
            size='sm'
            colorScheme='blue'
          >
            {translate('common.viewAll')}
          </Button>
        )}
      </Card.Header>
      <TransactionHistoryList txIds={recentTxIds} useCompactMode={true} />
    </Card>
  )
}
