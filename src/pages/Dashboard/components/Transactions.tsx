import { Stack } from '@chakra-ui/react'
import { createSelector } from '@reduxjs/toolkit'
import concat from 'lodash/concat'
import orderBy from 'lodash/orderBy'
import { useSelector } from 'react-redux'
import { TransactionRow } from 'components/TransactionRow/TransactionRow'
import { ReduxState } from 'state/reducer'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

const selectFilteredByType = createSelector(
  (state: ReduxState) => state.txHistory,
  (txHistory: { [key: string]: Tx[] }) =>
    orderBy(concat(...Object.values(txHistory)), ['blockTime'], 'desc').slice(0, 10)
)

export const Transactions = () => {
  const txs = useSelector(selectFilteredByType)

  return (
    <Stack spacing={0}>
      {txs?.map((tx: Tx) => (
        <TransactionRow key={`${tx.type}-${tx.txid}-${tx.asset}`} tx={tx} />
      ))}
    </Stack>
  )
}
