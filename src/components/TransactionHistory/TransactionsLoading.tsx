import { Stack } from '@chakra-ui/react'
import { Card } from 'components/Card/Card'
import { TransactionLoading } from 'components/TransactionHistoryRows/TransactionLoading'
export const TransactionsLoading = () => {
  const array = new Array(10).fill('')
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
