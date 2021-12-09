import { createSlice } from '@reduxjs/toolkit'
import { CAIP2, CAIP19 } from '@shapeshiftoss/caip'
import { chainAdapters, ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'
import filter from 'lodash/filter'
import isEqual from 'lodash/isEqual'
import orderBy from 'lodash/orderBy'
import values from 'lodash/values'
import { createSelector } from 'reselect'
import { ReduxState } from 'state/reducer'

export type Tx = chainAdapters.SubscribeTxsMessage<ChainTypes> & { accountType?: UtxoAccountType }

export type TxFilter = {
  accountType?: UtxoAccountType
  caip19?: CAIP19
  caip2?: CAIP2
  txid?: string
}

export type TxHistoryById = {
  [k: string]: Tx
}

export type TxHistory = {
  byId: TxHistoryById
  ids: string[]
}

export type TxMessage = { payload: { message: Tx } }

// https://redux.js.org/usage/structuring-reducers/normalizing-state-shape#designing-a-normalized-state
const initialState: TxHistory = {
  byId: {},
  ids: [] // sorted, newest first
}

export const txToId = (tx: Tx): string => `${tx.caip2}-${tx.txid}-${tx.accountType ?? ''}`

/**
 * Manage state of the txHistory slice
 *
 * If transaction already exists, update the value, otherwise add the new transaction
 */
const updateOrInsert = (txHistory: TxHistory, tx: Tx) => {
  // the unique id to key by
  const id = txToId(tx)
  const isNew = !txHistory.byId[id]

  // update or insert tx
  txHistory.byId[id] = tx

  // add id to ordered set for new tx
  if (isNew) {
    const orderedTxs = orderBy(txHistory.byId, 'blockTime', ['desc'])
    const index = orderedTxs.findIndex(t => txToId(t) === id)
    txHistory.ids.splice(index, 0, id)
  }

  // ^^^ redux toolkit uses the immer lib, which uses proxies under the hood
  // this looks like it's not doing anything, but changes written to the proxy
  // get applied to state when it goes out of scope
}

export const txHistory = createSlice({
  name: 'txHistory',
  initialState,
  reducers: {
    clear: () => initialState,
    onMessage: (state, { payload }: TxMessage) => updateOrInsert(state, payload.message)
  }
})

export const selectTxs = (state: ReduxState) => values(state.txHistory.byId)

export const selectTxHistoryByFilter = createSelector(
  (state: ReduxState) => state.txHistory,
  (_state: ReduxState, txFilter: TxFilter) => txFilter,
  (txHistory: TxHistory, txFilter: TxFilter) => {
    if (!txFilter) return values(txHistory.byId)
    const { txid, accountType, caip19, caip2 } = txFilter
    const filterFunc = (tx: Tx) => {
      let hasItem = true
      if (caip2) hasItem = tx.caip2 === caip2 && hasItem
      if (caip19) hasItem = tx.transfers.some(t => t.caip19 === caip19) && hasItem
      if (txid) hasItem = tx.txid === txid && hasItem
      if (accountType) hasItem = tx.accountType === accountType && hasItem
      return hasItem
    }
    return filter(txHistory.byId, filterFunc)
  }
)

export const selectLastNTxIds = createSelector(
  // ids will always change
  (state: ReduxState) => state.txHistory.ids,
  (_state: ReduxState, count: number) => count,
  (ids, count) => ids.slice(0, count),
  // https://github.com/reduxjs/reselect#createselectorinputselectors--inputselectors-resultfunc-selectoroptions
  // we're doing a deel equality check on the output
  // meaning the selector returns the same array ref
  // regardless of if the input has changed
  { memoizeOptions: { resultEqualityCheck: isEqual } }
)

export const selectTxById = createSelector(
  (state: ReduxState) => state.txHistory.byId,
  (_state: ReduxState, txId: string) => txId,
  (txsById, txId) => txsById[txId]
)

export const selectTxIdsByFilter = createSelector(
  (state: ReduxState) => state.txHistory.ids,
  (_state: ReduxState, filter: TxFilter) => filter,
  (ids, txFilter) => {
    const vals = filter(values(txFilter), Boolean) // only include non null filters
    return filter(ids, id => vals.every(val => id.includes(val)))
  }
)
