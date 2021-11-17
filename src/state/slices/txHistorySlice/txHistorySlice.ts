import { createSlice } from '@reduxjs/toolkit'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import concat from 'lodash/concat'
import filter from 'lodash/filter'
import isEqual from 'lodash/isEqual'
import orderBy from 'lodash/orderBy'
import { createSelectorCreator, defaultMemoize } from 'reselect'
import { ReduxState } from 'state/reducer'

export type Tx = chainAdapters.SubscribeTxsMessage<ChainTypes> & { accountType?: string }
export type TxHistory = Record<ChainTypes, Record<string, Tx>>
export type TxMessage = { payload: { message: Tx } }

export type Filter = {
  accountType?: string
  identifier?: string
  tradeIdentifier?: string // Temporary hack because unchained only returns symbols for trade details
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

const initialState: TxHistory = {
  [ChainTypes.Ethereum]: {},
  [ChainTypes.Bitcoin]: {}
}

/**
 * Manage state of the txHistory slice
 *
 * If transaction already exists, update the value, otherwise add the new transaction
 */
const updateOrInsert = (txs: Record<string, Tx> | undefined, tx: Tx): Record<string, Tx> => {
  const key = `${tx.txid}${tx.accountType || ''}${tx.type}`
  if (!txs) return { [key]: tx }
  txs[key] = tx
  return txs
}

export const txHistory = createSlice({
  name: 'txHistory',
  initialState,
  reducers: {
    clear: () => initialState,
    onMessage: (state, { payload }: TxMessage) => {
      const chain = payload.message.chain
      state[chain] = updateOrInsert(state[chain], payload.message)
    }
  }
})

// https://github.com/reduxjs/reselect#q-why-is-my-selector-recomputing-when-the-input-state-stays-the-same
// TODO(0xdef1cafe): check this for performance
// create a "selector creator" that uses lodash.isequal instead of ===
const createDeepEqualSelector = createSelectorCreator(defaultMemoize, isEqual)
export const selectTxHistory = createDeepEqualSelector(
  (state: ReduxState, { chain }: TxHistorySelect) => {
    return chain
      ? Object.values(state.txHistory[chain] ?? {})
      : concat(...Object.values(state.txHistory).map(txMap => Object.values(txMap)))
  },
  (_, { filter }: TxHistorySelect) => {
    if (!filter) return

    return (tx: Tx): boolean => {
      let hasItem = true
      if (filter.tradeIdentifier && tx.tradeDetails) {
        hasItem =
          (tx.tradeDetails?.sellAsset === filter.tradeIdentifier ||
            tx.tradeDetails?.buyAsset === filter.tradeIdentifier) &&
          hasItem
      } else if (filter.identifier)
        hasItem = tx.asset.toLowerCase() === filter.identifier && hasItem

      if (filter.txid) hasItem = tx.txid === filter.txid && hasItem
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
