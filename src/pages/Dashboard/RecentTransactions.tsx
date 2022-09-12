import { useSelector } from 'react-redux'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { TransactionHistoryList } from 'components/TransactionHistory/TransactionHistoryList'
import type { ReduxState } from 'state/reducer'
import { selectLastNTxIds } from 'state/slices/selectors'

export const RecentTransactions = () => {
  const recentTxIds = useSelector((state: ReduxState) => selectLastNTxIds(state, 10))

  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          <Text translation={'dashboard.recentTransactions.recentTransactions'} />
        </Card.Heading>
      </Card.Header>
      <TransactionHistoryList txIds={recentTxIds} useCompactMode={true} />
    </Card>
  )
}
