import { Stack } from '@chakra-ui/react'
import { useSelector } from 'react-redux'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { TransactionRow } from 'components/Transactions/TransactionRow'
import { ReduxState } from 'state/reducer'
import { selectTxHistory, Tx } from 'state/slices/txHistorySlice/txHistorySlice'

export const RecentTransactions = () => {
  const txs = useSelector((state: ReduxState) => selectTxHistory(state, {}))

  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          <Text translation={'dashboard.recentTransactions.recentTransactions'} />
        </Card.Heading>
      </Card.Header>
      <Card.Body px={2} pt={0}>
        <Stack spacing={0}>
          {txs?.map((tx: Tx) => (
            <TransactionRow key={`${tx.type}-${tx.txid}-${tx.asset}`} tx={tx} />
          ))}
        </Stack>
      </Card.Body>
    </Card>
  )
}
