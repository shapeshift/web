import { useSelector } from 'react-redux'
import type { CardProps } from 'components/Card/Card'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { TransactionHistoryList } from 'components/TransactionHistory/TransactionHistoryList'
import type { ReduxState } from 'state/reducer'
import { selectLastNTxIds } from 'state/slices/selectors'

type RecentTransactionProps = CardProps

export const RecentTransactions: React.FC<RecentTransactionProps> = props => {
  const recentTxIds = useSelector((state: ReduxState) => selectLastNTxIds(state, 10))

  return (
    <Card {...props}>
      <Card.Header>
        <Card.Heading>
          <Text translation={'dashboard.recentTransactions.recentTransactions'} />
        </Card.Heading>
      </Card.Header>
      <TransactionHistoryList txIds={recentTxIds} useCompactMode={true} />
    </Card>
  )
}
