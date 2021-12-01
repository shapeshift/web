import { createSlice } from '@reduxjs/toolkit'
import { CAIP2, CAIP19 } from '@shapeshiftoss/caip'
import { chainAdapters, ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'
import filter from 'lodash/filter'
import orderBy from 'lodash/orderBy'
import values from 'lodash/values'
import { createSelector } from 'reselect'
import { caip2FromTx, caip19FromTx } from 'lib/txs'
import { ReduxState } from 'state/reducer'

export type Tx = chainAdapters.SubscribeTxsMessage<ChainTypes> & { accountType?: UtxoAccountType }

export type TxFilter = {
  accountType?: UtxoAccountType
  symbol?: string
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

export const makeTxId = (tx: Tx): string =>
  `${caip19FromTx(tx)}-${tx.txid}-${tx.asset}-${tx.accountType || ''}${tx.type}`

/**
 * Manage state of the txHistory slice
 *
 * If transaction already exists, update the value, otherwise add the new transaction
 */
const updateOrInsert = (txHistory: TxHistory, tx: Tx) => {
  // the unique id to key by
  const id = makeTxId(tx)

  // desc is newest first
  const orderedTxs = orderBy(txHistory.byId, 'blockTime', ['desc'])

  // where to insert the unique id in our sorted index
  // unchained generally returns newest first, so iterate backwards
  let index = 0
  for (let i = txHistory.ids.length - 1; i >= 0; i--) {
    if (tx.blockTime > orderedTxs[i]?.blockTime) continue
    index = i + 1
    break
  }

  // splice the new tx in the correct order
  if (!txHistory.ids.includes(id)) txHistory.ids.splice(index, 0, id)

  // TODO(0xdef1cafe): we should maintain multiple indexes, e.g. by chain, asset, orders

  // order in the object doesn't matter, but we must do this after
  // figuring out the index
  txHistory.byId[id] = tx

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
    const { symbol, txid, accountType, caip19, caip2 } = txFilter
    const filterFunc = (tx: Tx) => {
      let hasItem = true
      if (symbol && tx.tradeDetails) {
        hasItem =
          (tx.tradeDetails?.sellAsset === symbol || tx.tradeDetails?.buyAsset === symbol) && hasItem
      }
      if (caip2) hasItem = caip2FromTx(tx) === caip2 && hasItem
      if (caip19) hasItem = caip19FromTx(tx) === caip19 && hasItem
      if (txid) hasItem = tx.txid === txid && hasItem
      if (accountType) hasItem = tx.accountType === accountType && hasItem
      return hasItem
    }
    return filter(txHistory.byId, filterFunc)
  }
)

export const selectLastNTxIds = createSelector(
  (state: ReduxState) => state.txHistory.ids,
  (_state: ReduxState, count: number) => count,
  (ids, count) => ids.slice(0, count)
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
