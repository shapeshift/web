import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { Transactions } from 'components/Transactions/Transactions'

export const RecentTransactions = () => {
  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          <Text translation={'dashboard.recentTransactions.recentTransactions'} />
        </Card.Heading>
      </Card.Header>
      <Card.Body px={2} pt={0}>
        <Transactions limit={8} />
      </Card.Body>
    </Card>
  )
}
