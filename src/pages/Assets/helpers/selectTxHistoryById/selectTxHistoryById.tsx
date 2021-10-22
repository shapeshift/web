import { createSelector } from '@reduxjs/toolkit'
import { ChainTypes } from '@shapeshiftoss/types'
import filter from 'lodash/filter'
import orderBy from 'lodash/orderBy'
import { ReduxState } from 'state/reducer'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

export const selectTxHistoryById = createSelector(
  (state: ReduxState, chain: ChainTypes | string, identifier: string) =>
    filter(state.txHistory[chain ?? ''], tx => tx.asset === identifier),
  (txs: Tx[]) => orderBy(txs, ['blockTime'], 'desc')
)
