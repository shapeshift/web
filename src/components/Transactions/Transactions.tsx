import { Center, Stack } from '@chakra-ui/react'
import { CircularProgress } from 'components/CircularProgress'
import { FormatTransactionType, useTransactions } from 'hooks/useTransactions/useTransactions'

import { TransactionRow } from './TransactionRow'

export const Transactions = ({
  chain,
  contractAddress,
  symbol
}: {
  chain?: string
  contractAddress?: string
  symbol?: string
}) => {
  const { loading, txHistory } = useTransactions({ chain, contractAddress, symbol })
  const txs = txHistory?.txs ?? []

  return loading ? (
    <Center width='full'>
      <CircularProgress isIndeterminate />
    </Center>
  ) : (
    <Stack spacing={0}>
      {txs.map((tx: FormatTransactionType, index: number) => (
        <TransactionRow key={index} tx={tx} />
      ))}
    </Stack>
  )
}
