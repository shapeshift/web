import { createSelector } from '@reduxjs/toolkit'
import concat from 'lodash/concat'
import orderBy from 'lodash/orderBy'
import { ReduxState } from 'state/reducer'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

export const selectRecentTxHistory = createSelector(
  (state: ReduxState) => state.txHistory,
  (txHistory: { [key: string]: Tx[] }) =>
    orderBy(concat(...Object.values(txHistory)), ['blockTime'], 'desc').slice(0, 10)
)
