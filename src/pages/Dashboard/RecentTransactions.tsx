import { useSelector } from 'react-redux'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { Transactions } from 'components/Transactions/Transactions'

import { selectRecentTxHistory } from './helpers/selectRecentTxHistory/selectRecentTxHistory'

export const RecentTransactions = () => {
  const txs = useSelector(selectRecentTxHistory)

  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          <Text translation={'dashboard.recentTransactions.recentTransactions'} />
        </Card.Heading>
      </Card.Header>
      <Card.Body px={2} pt={0}>
        <Transactions txs={txs} />
      </Card.Body>
    </Card>
  )
}
