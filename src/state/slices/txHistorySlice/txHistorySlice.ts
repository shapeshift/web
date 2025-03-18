import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId, isNft } from '@shapeshiftoss/caip'
import type { Transaction } from '@shapeshiftoss/chain-adapters'
import type { PartialRecord, UtxoAccountType } from '@shapeshiftoss/types'
import orderBy from 'lodash/orderBy'
import PQueue from 'p-queue'
import { PURGE } from 'redux-persist'

import { getRelatedAssetIds, serializeTxIndex } from './utils'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { deepUpsertArray } from '@/lib/utils'
import { BASE_RTK_CREATE_API_CONFIG } from '@/state/apis/const'
import {
  BLACKLISTED_COLLECTION_IDS,
  isSpammyNftText,
  isSpammyTokenText,
} from '@/state/apis/nft/constants'
import type { State } from '@/state/apis/types'
import type { Nominal } from '@/types/common'

export type TxId = Nominal<string, 'TxId'>
export type Tx = Transaction & { accountType?: UtxoAccountType }

export type TxHistoryById = {
  [k: TxId]: Tx
}

/* this is a one to many relationship of an account and asset id to tx id
 *
 * e.g. an account with a single trade of FOX to USDC will produce the following
 * three related assets
 *
 * {
 *   0xfoobaraccount: {
 *     foxAssetId: [txid] // sell asset
 *     usdcAssetId: [txid] // buy asset
 *     ethAssetId: [txid] // fee asset
 *   }
 * }
 *
 * where txid is the same txid related to all the above assets, as the
 * sell asset, buy asset, and fee asset respectively
 *
 * this allows us to O(1) select all related transactions to a given asset
 *
 * note - we persist this data structure to disk across page refresh, and wallet disconnections
 * and use the accountIds from the connected wallet to index into it
 */

type TransactionsByAccountId = Record<AccountId, Transaction[]>

export type TxIdsByAssetId = PartialRecord<AssetId, TxId[]>
export type TxIdsByAccountIdAssetId = PartialRecord<AccountId, TxIdsByAssetId>

export type TxsState = {
  byId: TxHistoryById
  byAccountIdAssetId: TxIdsByAccountIdAssetId
  ids: TxId[]
}

export type TxHistory = {
  txs: TxsState
  hydrationMeta: PartialRecord<
    AccountId,
    { isHydrated: boolean; minTxBlockTime?: number; isErrored: boolean }
  >
  // See https://redux-toolkit.js.org/rtk-query/usage/pagination
  // RTK doesn't have first-class pagination support, but can be driven by a simple pagination API
  // For the sake of simplicity, we're attaching the pagination state to the txHistory slice, so consumers
  // know of the pagination state and can drive it as-needed.
  pagination: Record<
    AccountId,
    {
      currentPage: number
      totalPages: number
      hasMore: boolean
      cursors: Record<number, string>
    }
  >
}

export type TxMessage = { payload: { message: Tx; accountId: AccountId } }
export type TxsMessage = {
  payload: TransactionsByAccountId
}

export const initialState: TxHistory = {
  txs: {
    byAccountIdAssetId: {},
    byId: {},
    ids: [], // sorted, newest first
  },
  hydrationMeta: {},
  pagination: {},
}

const checkIsSpam = (tx: Tx): boolean => {
  return tx.transfers.some(({ assetId, token }) => {
    if (!token) return false

    const { name, symbol } = token

    if (isNft(assetId)) {
      return (
        [name, symbol].some(text => isSpammyNftText(text, true)) ||
        BLACKLISTED_COLLECTION_IDS.includes(assetId)
      )
    } else {
      return [name, symbol].some(isSpammyTokenText)
    }
  })
}

const updateOrInsertTxs = (txHistory: TxHistory, incomingTxs: Tx[], accountId: AccountId) => {
  const { txs, hydrationMeta } = txHistory

  let newTxAdded = false
  let minTxBlockTime = Infinity
  for (const tx of incomingTxs) {
    if (checkIsSpam(tx)) continue
    if (tx.blockTime < minTxBlockTime) minTxBlockTime = tx.blockTime

    const txIndex = serializeTxIndex(accountId, tx.txid, tx.pubkey, tx.data)

    // track if new transactions have been added to prompt (re)sort of ids
    if (newTxAdded === false && !txs.byId[txIndex]) newTxAdded = true

    // update or insert tx
    txs.byId[txIndex] = tx

    // find all the related assetIds, and keep an index of txids related to each assetId
    getRelatedAssetIds(tx).forEach(relatedAssetId =>
      deepUpsertArray(txs.byAccountIdAssetId, accountId, relatedAssetId, txIndex),
    )
  }

  // (re)sort ids by block timestamp if any new transaction were added
  if (newTxAdded) {
    const getBlockTime = ([_, tx]: [string, Tx]) => tx.blockTime
    txs.ids = orderBy(Object.entries(txs.byId), getBlockTime, 'desc').map(([txIndex, _]) => txIndex)
  }

  // update the min tx block time if required
  if (minTxBlockTime < (hydrationMeta[accountId]?.minTxBlockTime ?? Infinity)) {
    hydrationMeta[accountId] = {
      isHydrated: false,
      isErrored: false,
      minTxBlockTime,
    }
  }
}

export const txHistory = createSlice({
  name: 'txHistory',
  initialState,
  reducers: {
    clear: () => {
      return initialState
    },
    onMessage: (txState, { payload }: TxMessage) => {
      updateOrInsertTxs(txState, [payload.message], payload.accountId)
    },
    upsertTxsByAccountId: (txState, { payload }: TxsMessage) => {
      for (const [accountId, txs] of Object.entries(payload)) {
        updateOrInsertTxs(txState, txs, accountId)
      }

      return txState
    },
    setAccountIdHydrated: (txState, { payload }: { payload: AccountId }) => {
      txState.hydrationMeta[payload] = {
        minTxBlockTime: txState.hydrationMeta[payload]?.minTxBlockTime,
        isHydrated: true,
        isErrored: false,
      }
    },
    setAccountIdErrored: (txState, { payload }: { payload: AccountId }) => {
      txState.hydrationMeta[payload] = {
        minTxBlockTime: txState.hydrationMeta[payload]?.minTxBlockTime,
        isHydrated: false,
        isErrored: true,
      }
    },
    updatePagination: (
      txState,
      {
        payload,
      }: {
        payload: {
          accountId: AccountId
          page: number
          cursor: string
          hasMore: boolean
        }
      },
    ) => {
      const { accountId, page, cursor, hasMore } = payload

      if (!txState.pagination[accountId]) {
        txState.pagination[accountId] = {
          currentPage: page,
          totalPages: hasMore ? page + 1 : page,
          hasMore,
          cursors: {},
        }
      } else {
        if (hasMore) {
          txState.pagination[accountId].totalPages = Math.max(
            page + 1,
            txState.pagination[accountId].totalPages,
          )
        } else if (page > txState.pagination[accountId].totalPages) {
          txState.pagination[accountId].totalPages = page
        }
      }

      txState.pagination[accountId].cursors[page] = cursor
      txState.pagination[accountId].hasMore = hasMore
      txState.pagination[accountId].currentPage = page
    },
  },
  extraReducers: builder => {
    builder.addCase(PURGE, () => initialState)
  },
})

// Add types for API requests and responses
type TxHistoryResponse = {
  page: number
  per_page: number
  total: number
  total_pages: number
  data: Tx[]
  cursor: string
}

type TxHistoryRequest = {
  accountId: AccountId
  page?: number
  pageSize?: number
}

const requestQueue = new PQueue({ concurrency: 2 })

export const txHistoryApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'txHistoryApi',
  tagTypes: ['TxHistory'],
  endpoints: build => ({
    getAllTxHistory: build.query<TxHistoryResponse, TxHistoryRequest>({
      queryFn: async ({ accountId, page = 1, pageSize = 10 }, { dispatch, getState }) => {
        const { chainId, account: pubkey } = fromAccountId(accountId)
        const adapter = getChainAdapterManager().get(chainId)

        if (!adapter) {
          const data = `getAllTxHistory: no adapter available for chainId ${chainId}`
          return { error: { data, status: 400 } }
        }

        try {
          // Get the stored cursor for this page if available
          const state = getState() as State
          const paginationState = state.txHistory.pagination[accountId] || {}

          // Use the cursor from the previous page to fetch the next page
          // For page 1, we start with an empty cursor
          const storedCursor = page === 1 ? '' : paginationState.cursors?.[page - 1] || ''

          const { cursor, transactions } = await adapter.getTxHistory({
            cursor: storedCursor,
            pubkey,
            pageSize,
            requestQueue,
          })

          // Store the transactions
          const results: TransactionsByAccountId = { [accountId]: transactions }
          dispatch(txHistory.actions.upsertTxsByAccountId(results))

          // Store the cursor for pagination
          dispatch(
            txHistory.actions.updatePagination({
              accountId,
              page,
              cursor,
              hasMore: !!cursor,
            }),
          )

          // Estimate total pages based on cursor presence
          const hasMore = !!cursor
          const estimatedTotalPages = hasMore
            ? Math.max(page + 1, paginationState.totalPages || 0)
            : page

          // Update the estimated total count
          const estimatedTotal = (estimatedTotalPages - 1) * pageSize + transactions.length

          return {
            data: {
              page,
              per_page: pageSize,
              total: estimatedTotal,
              total_pages: estimatedTotalPages,
              data: transactions,
              cursor,
            },
          }
        } catch (err) {
          console.error(err)
          dispatch(txHistory.actions.setAccountIdErrored(accountId))
          return { error: { data: String(err), status: 500 } }
        }
      },
      providesTags: (result, _error, { accountId, page }) =>
        result
          ? [
              { type: 'TxHistory', id: `${accountId}-page-${page}` },
              { type: 'TxHistory', id: accountId },
            ]
          : [{ type: 'TxHistory', id: accountId }],
    }),
  }),
})
