import { Stack } from '@chakra-ui/react'
import { TransactionRow } from 'components/Transactions/TransactionRow'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

export const Transactions = ({ txs }: { txs: Tx[] }) => {
  return (
    <Stack spacing={0}>
      {txs?.map((tx: Tx) => (
        <TransactionRow key={`${tx.type}-${tx.txid}-${tx.asset}`} tx={tx} />
      ))}
    </Stack>
  )
}
