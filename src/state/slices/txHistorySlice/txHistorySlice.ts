import { createSlice } from '@reduxjs/toolkit'
import { CAIP2, CAIP19 } from '@shapeshiftoss/caip'
import { chainAdapters, ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'
import filter from 'lodash/filter'
import isEqual from 'lodash/isEqual'
import orderBy from 'lodash/orderBy'
import values from 'lodash/values'
import { createSelector, createSelectorCreator, defaultMemoize } from 'reselect'
import { caip2FromTx, caip19FromTx } from 'lib/txs'
import { ReduxState } from 'state/reducer'

export type Tx = chainAdapters.SubscribeTxsMessage<ChainTypes> & {
  accountType?: UtxoAccountType
  // TODO(0xdef1cafe): add these on the way into the store
  // txCAIP19: CAIP19
  // feeCAIP19: CAIP19
}

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
  // this *mutates* the array, keeping the same ref
  if (!txHistory.ids.includes(id)) txHistory.ids.splice(index, 0, id)

  // order in the object doesn't matter, but we must do this after
  // figuring out the index
  txHistory.byId[id] = tx

  // return txHistory
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

const createDeepEqualSelector = createSelectorCreator(defaultMemoize, isEqual)

const _selectLastNTxIds = createSelector(
  (state: ReduxState) => state.txHistory.ids, // ids
  (_state: ReduxState, count: number) => count, // count
  (ids, count) => ids.slice(0, count)
)

export const selectLastNTxIds = createDeepEqualSelector(_selectLastNTxIds, ids => ids)

export const selectTxById = createSelector(
  (state: ReduxState) => state.txHistory.byId,
  (_state: ReduxState, txId: string) => txId,
  (txsById, txId) => txsById[txId]
)

export const selectTxIdsByCAIP19 = createSelector(
  (state: ReduxState) => state.txHistory.ids,
  (_state: ReduxState, caip19: string) => caip19,
  (ids, caip19) => ids.filter(id => id.includes(caip19))
)
