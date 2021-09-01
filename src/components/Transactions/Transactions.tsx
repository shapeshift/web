import { Stack } from '@chakra-ui/react'

import { TransactionRow } from './TransactionRow'

export const Transactions = ({ limit }: { limit: number }) => {
  const array = Array(limit).fill(0)
  return (
    <Stack spacing={0}>
      {array.map((item, index) => (
        <TransactionRow key={index} />
      ))}
    </Stack>
  )
}
