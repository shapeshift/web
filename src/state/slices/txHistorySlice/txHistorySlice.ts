import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId, gnosisChainId, isNft, polygonChainId } from '@shapeshiftoss/caip'
import type { Transaction } from '@shapeshiftoss/chain-adapters'
import type { PartialRecord, UtxoAccountType } from '@shapeshiftoss/types'
import orderBy from 'lodash/orderBy'
import { PURGE } from 'redux-persist'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { deepUpsertArray } from 'lib/utils'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import {
  BLACKLISTED_COLLECTION_IDS,
  isSpammyNftText,
  isSpammyTokenText,
} from 'state/apis/nft/constants'
import type { State } from 'state/apis/types'
import type { Nominal } from 'types/common'

import { getRelatedAssetIds, serializeTxIndex } from './utils'

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
}

const checkIsSpam = (tx: Tx): boolean => {
  return tx.transfers.some(({ assetId, token }) => {
    if (!token) return false

    const { name, symbol } = token

    if (isNft(assetId)) {
      return [name, symbol].some(isSpammyNftText) || BLACKLISTED_COLLECTION_IDS.includes(assetId)
    } else {
      return [name, symbol].some(isSpammyTokenText)
    }
  })
}

/**
 * Manage state of the txHistory slice
 *
 * If transaction already exists, update the value, otherwise add the new transaction
 */

const updateOrInsertTx = (txHistory: TxHistory, tx: Tx, accountId: AccountId) => {
  const { txs } = txHistory

  if (checkIsSpam(tx)) return

  const txIndex = serializeTxIndex(accountId, tx.txid, tx.address, tx.data)

  const isNew = !txs.byId[txIndex]

  // update or insert tx
  txs.byId[txIndex] = tx

  // add id to ordered set for new tx
  if (isNew) {
    const orderedTxs = orderBy(txs.byId, 'blockTime', ['desc'])
    const index = orderedTxs.findIndex(
      tx => serializeTxIndex(accountId, tx.txid, tx.address, tx.data) === txIndex,
    )
    txs.ids.splice(index, 0, txIndex)
  }

  // for a given tx, find all the related assetIds, and keep an index of
  // txids related to each asset id
  getRelatedAssetIds(tx).forEach(relatedAssetId =>
    deepUpsertArray(txs.byAccountIdAssetId, accountId, relatedAssetId, txIndex),
  )
}

export const txHistory = createSlice({
  name: 'txHistory',
  initialState,
  reducers: {
    clear: () => {
      return initialState
    },
    onMessage: (txState, { payload }: TxMessage) =>
      updateOrInsertTx(txState, payload.message, payload.accountId),
    upsertTxsByAccountId: (txState, { payload }: TxsMessage) => {
      for (const [accountId, txs] of Object.entries(payload)) {
        for (const tx of txs) {
          updateOrInsertTx(txState, tx, accountId)
        }
      }
    },
  },
  extraReducers: builder => builder.addCase(PURGE, () => initialState),
})

export const txHistoryApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'txHistoryApi',
  endpoints: build => ({
    getAllTxHistory: build.query<null, AccountId[]>({
      queryFn: async (accountIds, { dispatch, getState }) => {
        const results: TransactionsByAccountId = {}
        await Promise.all(
          accountIds.map(async accountId => {
            results[accountId] = []

            const { chainId, account: pubkey } = fromAccountId(accountId)
            const adapter = getChainAdapterManager().get(chainId)

            if (!adapter) {
              const data = `getAllTxHistory: no adapter available for chainId ${chainId}`
              return { error: { data, status: 400 } }
            }

            try {
              let currentCursor = ''
              do {
                const pageSize = (() => {
                  switch (chainId) {
                    case gnosisChainId:
                    case polygonChainId:
                      return 10
                    default:
                      return 100
                  }
                })()

                const { cursor, transactions } = await adapter.getTxHistory({
                  cursor: currentCursor,
                  pubkey,
                  pageSize,
                })

                const state = getState() as State
                const txsById = state.txHistory.txs.byId

                const newTxs: Transaction[] = []
                for (const tx of transactions) {
                  if (txsById[serializeTxIndex(accountId, tx.txid, tx.address, tx.data)]) break
                  newTxs.push(tx)
                }

                results[accountId].push(...newTxs)

                /**
                 * We have run into a transaction that already exists in the store, stop fetching more history
                 *
                 * TODO: An edge case exists if there was an error fetching transaction history after at least one page was fetched.
                 * We will think we ran into the latest existing transaction in the store and stop fetching,
                 * but all transaction history after the failed response on the initial `getAllTxHistory` call will still be missing.
                 */
                if (newTxs.length < pageSize) break

                currentCursor = cursor
              } while (currentCursor)
            } catch (err) {
              console.error(err)
            }
          }),
        )

        dispatch(txHistory.actions.upsertTxsByAccountId(results))

        return { data: null }
      },
    }),
  }),
})
