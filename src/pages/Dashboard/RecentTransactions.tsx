import type { CardProps } from '@chakra-ui/react'
import { Button, Card, CardHeader, Heading } from '@chakra-ui/react'
import { memo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { NavLink } from 'react-router-dom'
import { Text } from 'components/Text'
import { TransactionHistoryList } from 'components/TransactionHistory/TransactionHistoryList'
import { selectTxIds } from 'state/slices/selectors'

type RecentTransactionProps = { limit?: number; viewMoreLink?: boolean } & CardProps

export const RecentTransactions: React.FC<RecentTransactionProps> = memo(
  ({ limit = 10, viewMoreLink, ...rest }) => {
    const txIds = useSelector(selectTxIds)
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
        <TransactionHistoryList txIds={txIds} useCompactMode={true} initialTxsCount={limit} />
      </Card>
    )
  },
)
