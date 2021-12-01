import { Stack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { TransactionRow } from 'components/Transactions/TransactionRow'
import { ReduxState } from 'state/reducer'
import { selectLastNTxIds } from 'state/slices/txHistorySlice/txHistorySlice'

export const RecentTransactions = () => {
  const recentTxIds = useSelector((state: ReduxState) => selectLastNTxIds(state, 10))
  const txRows = useMemo(
    () => recentTxIds.map((txId, i) => <TransactionRow key={`${txId}-${i}`} txId={txId} />),
    [recentTxIds]
  )

  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          <Text translation={'dashboard.recentTransactions.recentTransactions'} />
        </Card.Heading>
      </Card.Header>
      <Card.Body px={2} pt={0}>
        <Stack spacing={0}>{txRows}</Stack>
      </Card.Body>
    </Card>
  )
}
