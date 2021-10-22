import { Stack } from '@chakra-ui/react'
import { createSelector } from '@reduxjs/toolkit'
import { ChainTypes } from '@shapeshiftoss/types'
import filter from 'lodash/filter'
import orderBy from 'lodash/orderBy'
import { useSelector } from 'react-redux'
import { TransactionRow } from 'components/TransactionRow/TransactionRow'
import { UseTransactionsPropType } from 'hooks/useTransactions/useTransactions'
import { ReduxState } from 'state/reducer'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

const selectFilteredByType = createSelector(
  (state: ReduxState, chain: ChainTypes | string, identifier: string) =>
    filter(state.txHistory[chain ?? ''], tx => tx.asset === identifier),
  (txs: Tx[]) => orderBy(txs, ['blockTime'], 'desc')
)

export const Transactions = ({ chain, contractAddress, symbol }: UseTransactionsPropType = {}) => {
  const txs = useSelector((state: ReduxState) =>
    selectFilteredByType(state, chain ?? '', contractAddress ?? chain)
  )

  return (
    <Stack spacing={0}>
      {txs?.map((tx: Tx) => (
        <TransactionRow key={`${tx.type}-${tx.txid}`} tx={tx} />
      ))}
    </Stack>
  )
}
