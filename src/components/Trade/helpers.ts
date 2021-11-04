import { createSelector } from '@reduxjs/toolkit'
import { ChainTypes } from '@shapeshiftoss/types'
import filter from 'lodash/filter'
import orderBy from 'lodash/orderBy'
import { ReduxState } from 'state/reducer'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

// Should probably just return the tx, ran out of time
export const selectTxHistoryByTxid = createSelector(
  (state: ReduxState, chain: ChainTypes | string, asset: string, txid: string) =>
    filter(state.txHistory[chain], tx => tx.asset === asset && tx.txid === txid),
  (txs: Tx[]) => orderBy(txs, ['blockTime', 'status'], 'desc')
)
