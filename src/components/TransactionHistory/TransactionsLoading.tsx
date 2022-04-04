import { Stack } from '@chakra-ui/react'
import { Card } from 'components/Card/Card'
import { TransactionLoading } from 'components/TransactionHistoryRows/TransactionLoading'

type TransactionsLoadingProps = {
  count?: number
}

export const TransactionsLoading: React.FC<TransactionsLoadingProps> = ({ count = 10 }) => {
  const array = new Array(count).fill('')
  return (
    <Card.Body px={0} pt={0}>
      <Stack px={2}>
        {array.map((_, index) => (
          <TransactionLoading key={index} />
        ))}
      </Stack>
    </Card.Body>
  )
}
