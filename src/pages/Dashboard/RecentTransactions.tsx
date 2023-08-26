import type { CardProps } from '@chakra-ui/react'
import { Button, Card, CardHeader, Heading } from '@chakra-ui/react'
import { memo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { NavLink } from 'react-router-dom'
import { Text } from 'components/Text'
import { TransactionHistoryList } from 'components/TransactionHistory/TransactionHistoryList'
import type { ReduxState } from 'state/reducer'
import { selectLastNTxIds } from 'state/slices/selectors'

type RecentTransactionProps = { limit?: number; viewMoreLink?: boolean } & CardProps

export const RecentTransactions: React.FC<RecentTransactionProps> = memo(
  ({ limit = 10, viewMoreLink, ...rest }) => {
    const recentTxIds = useSelector((state: ReduxState) => selectLastNTxIds(state, limit))
    const translate = useTranslate()
    return (
      <Card variant='outline' {...rest}>
        <CardHeader display='flex' justifyContent='space-between' alignItems='center'>
          <Heading as='h5'>
            <Text translation={'dashboard.recentTransactions.recentTransactions'} />
          </Heading>
          {viewMoreLink && (
            <Button
              as={NavLink}
              to='/dashboard/activity'
              variant='link'
              size='sm'
              colorScheme='blue'
            >
              {translate('common.viewAll')}
            </Button>
          )}
        </CardHeader>
        <TransactionHistoryList txIds={recentTxIds} useCompactMode={true} />
      </Card>
    )
  },
)
