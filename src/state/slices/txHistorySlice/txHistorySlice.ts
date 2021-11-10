import { createSelector, createSlice } from '@reduxjs/toolkit'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import concat from 'lodash/concat'
import filter from 'lodash/filter'
import orderBy from 'lodash/orderBy'
import { ReduxState } from 'state/reducer'

export type Tx = chainAdapters.SubscribeTxsMessage<ChainTypes> & { accountType?: string }
export type TxHistory = Record<ChainTypes, Record<string, Tx>>
export type TxMessage = { payload: { message: Tx } }

export type Filter = {
  accountType?: string
  identifier?: string
  txid?: string
}
export type Sort = {
  direction: 'asc' | 'desc'
}
export type TxHistorySelect = {
  chain?: ChainTypes
  filter?: Filter
  sort?: Sort
}

const initialState = {} as TxHistory

/**
 * Manage state of the txHistory slice
 *
 * If transaction already exists, update the value, otherwise add the new transaction
 */
const updateOrInsert = (txs: Record<string, Tx> | undefined, tx: Tx): Record<string, Tx> => {
  if (!txs) return { [tx.txid]: tx }
  txs[tx.txid] = tx
  return txs
}

export const txHistory = createSlice({
  name: 'txHistory',
  initialState,
  reducers: {
    onMessage(state, { payload }: TxMessage) {
      const chain = payload.message.chain
      state[chain] = updateOrInsert(state[chain], payload.message)
    }
  }
})

export const selectTxHistory = createSelector(
  (state: ReduxState, { chain }: TxHistorySelect) => {
    console.log({ chain })
    return chain
      ? Object.values(state.txHistory[chain] ?? {})
      : concat(...Object.values(state.txHistory).map(txMap => Object.values(txMap)))
  },
  (_, { filter }: TxHistorySelect) => {
    if (!filter) return
    console.log({ filter })

    return (tx: Tx): boolean => {
      let hasItem = true
      if (filter.txid) hasItem = tx.txid === filter.txid && hasItem
      if (filter.identifier) hasItem = tx.asset === filter.identifier && hasItem
      if (filter.accountType) hasItem = tx.accountType === filter.accountType && hasItem
      return hasItem
    }
  },
  (_, { sort }: TxHistorySelect) => ({
    keys: ['blockTime', 'status'],
    direction: [sort?.direction ?? 'desc', 'desc'] as Array<boolean | 'asc' | 'desc'>
  }),
  (txHistory, filterFunc, sort) => {
    if (filterFunc) txHistory = filter(txHistory, filterFunc)
    return orderBy(txHistory, sort.keys, sort.direction)
  }
)
