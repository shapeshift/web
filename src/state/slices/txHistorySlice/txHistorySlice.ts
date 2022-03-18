import { createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query'
import { CAIP2, caip2, CAIP19 } from '@shapeshiftoss/caip'
import { chainAdapters, ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import orderBy from 'lodash/orderBy'
import { getChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { AccountSpecifierMap } from 'hooks/useAccountSpecifiers/useAccountSpecifiers'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'

import { addToIndex, getRelatedAssetIds } from './utils'

export type TxId = string
export type Tx = chainAdapters.Transaction<ChainTypes> & { accountType?: UtxoAccountType }

export type TxFilter = {
  accountType?: UtxoAccountType
  caip19?: CAIP19
  caip2?: CAIP2
  txid?: TxId
}

export type TxHistoryById = {
  [k: TxId]: Tx
}

/* this is a one to many relationship of asset id to tx id, built up as
 * tx's come into the store over websockets
 *
 * e.g. an account with a single trade of FOX to USDC will produce the following
 * three related assets
 *
 * {
 *   foxCAIP19: [txid] // sell asset
 *   usdcCAIP19: [txid] // buy asset
 *   ethCAIP19: [txid] // fee asset
 * }
 *
 * where txid is the same txid related to all the above assets, as the
 * sell asset, buy asset, and fee asset respectively
 *
 * this allows us to O(1) select all related transactions to a given asset
 */

export type TxIdByAssetId = {
  [k: CAIP19]: TxId[]
}

export type TxIdByAccountId = {
  [k: AccountSpecifier]: TxId[]
}

// before the wallet is connected, we're idle
// when we subscribe to the history, we're loading
// after logic managing a delay after no new tx's in TransactionsProvider, we're loaded
export type TxHistoryStatus = 'idle' | 'loading' | 'loaded'

export type TxHistory = {
  byId: TxHistoryById
  byAssetId: TxIdByAssetId
  byAccountId: TxIdByAccountId
  ids: TxId[]
  status: TxHistoryStatus
}

export type TxMessage = { payload: { message: Tx; accountSpecifier: string } }
export type TxsMessage = {
  payload: { txs: chainAdapters.Transaction<ChainTypes>[]; accountSpecifier: string }
}

// https://redux.js.org/usage/structuring-reducers/normalizing-state-shape#designing-a-normalized-state
const initialState: TxHistory = {
  byId: {},
  ids: [], // sorted, newest first
  byAssetId: {},
  byAccountId: {},
  status: 'idle'
}

/**
 * Manage state of the txHistory slice
 *
 * If transaction already exists, update the value, otherwise add the new transaction
 */

/**
 * now we support accounts, we have a new problem
 * the same tx id can have multiple representations, depending on the
 * account's persective, especially utxos.
 *
 * i.e. a bitcoin send will have a send component, and a receive component for
 * the change, to a new address, but the same tx id.
 * this means we can't uniquely index tx's simply by their id.
 *
 * we'll probably need to go back to some composite index that can be built from
 * the txid and address, or account id, that can be deterministically generated,
 * from the tx data and the account id - note, not the address.
 *
 * the correct solution is to not rely on the parsed representation of the tx
 * as a "send" or "receive" from chain adapters, just index the tx related to the
 * asset or account, and parse the tx closer to the view layer.
 */
export const makeUniqueTxId = (tx: Tx, accountId: AccountSpecifier): string =>
  `${accountId}-${tx.txid}-${tx.address}`

const updateOrInsert = (txHistory: TxHistory, tx: Tx, accountSpecifier: AccountSpecifier) => {
  const txid = makeUniqueTxId(tx, accountSpecifier)

  const isNew = !txHistory.byId[txid]

  // update or insert tx
  txHistory.byId[txid] = tx

  // add id to ordered set for new tx
  if (isNew) {
    const orderedTxs = orderBy(txHistory.byId, 'blockTime', ['desc'])
    const index = orderedTxs.findIndex(tx => makeUniqueTxId(tx, accountSpecifier) === txid)
    txHistory.ids.splice(index, 0, txid)
  }

  // for a given tx, find all the related assetIds, and keep an index of
  // txids related to each asset id
  getRelatedAssetIds(tx).forEach(relatedAssetId => {
    txHistory.byAssetId[relatedAssetId] = addToIndex(
      txHistory.ids,
      txHistory.byAssetId[relatedAssetId],
      makeUniqueTxId(tx, accountSpecifier)
    )
  })

  // index the tx by the account that it belongs to
  txHistory.byAccountId[accountSpecifier] = addToIndex(
    txHistory.ids,
    txHistory.byAccountId[accountSpecifier],
    makeUniqueTxId(tx, accountSpecifier)
  )

  // ^^^ redux toolkit uses the immer lib, which uses proxies under the hood
  // this looks like it's not doing anything, but changes written to the proxy
  // get applied to state when it goes out of scope
}

type TxHistoryStatusPayload = { payload: TxHistoryStatus }

export const txHistory = createSlice({
  name: 'txHistory',
  initialState,
  reducers: {
    clear: () => initialState,
    setStatus: (state, { payload }: TxHistoryStatusPayload) => {
      state.status = payload
    },
    onMessage: (txState, { payload }: TxMessage) =>
      updateOrInsert(txState, payload.message, payload.accountSpecifier),
    upsertTxs: (txState, { payload }: TxsMessage) => {
      for (const tx of payload.txs) {
        updateOrInsert(txState, tx, payload.accountSpecifier)
      }
    }
  }
})

type AllTxHistoryArgs = { accountSpecifierMap: AccountSpecifierMap }

export const txHistoryApi = createApi({
  reducerPath: 'txHistoryApi',
  // not actually used, only used to satisfy createApi, we use a custom queryFn
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  // refetch if network connection is dropped, useful for mobile
  refetchOnReconnect: true,
  endpoints: build => ({
    getAllTxHistory: build.query<chainAdapters.Transaction<ChainTypes>[], AllTxHistoryArgs>({
      queryFn: async ({ accountSpecifierMap }, { dispatch }) => {
        if (isEmpty(accountSpecifierMap)) {
          const data = 'getAllTxHistory: No account specifier given to get all tx history'
          const error = { data, status: 400 }
          return { error }
        }
        const [CAIP2, pubkey] = Object.entries(accountSpecifierMap)[0] as [CAIP2, string]
        const accountSpecifier = `${CAIP2}:${pubkey}`
        try {
          let txs: chainAdapters.Transaction<ChainTypes>[] = []
          const chainAdapters = getChainAdapters()
          const { chain } = caip2.fromCAIP2(CAIP2)
          const adapter = chainAdapters.byChain(chain)
          let currentCursor: string = ''
          const pageSize = 100
          do {
            const { cursor: _cursor, transactions } = await adapter.getTxHistory({
              cursor: currentCursor,
              pubkey,
              pageSize
            })
            currentCursor = _cursor
            txs = [...txs, ...transactions]
          } while (currentCursor)
          dispatch(txHistory.actions.upsertTxs({ txs, accountSpecifier }))
          return { data: txs }
        } catch (err) {
          return {
            error: {
              data: `getAllTxHistory: An error occurred fetching all tx history for accountSpecifier: ${accountSpecifier}`,
              status: 500
            }
          }
        }
      }
    })
  })
})
