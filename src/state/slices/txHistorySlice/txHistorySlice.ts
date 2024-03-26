import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId, gnosisChainId, isNft, polygonChainId } from '@shapeshiftoss/caip'
import type { Transaction } from '@shapeshiftoss/chain-adapters'
import type { PartialRecord, UtxoAccountType } from '@shapeshiftoss/types'
import orderBy from 'lodash/orderBy'
import PQueue from 'p-queue'
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
import type { ReduxState } from 'state/reducer'
import type { Nominal } from 'types/common'

import { deserializeTxIndex, getRelatedAssetIds, serializeTxIndex } from './utils'

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

/**
 * Manage state of the txHistory slice
 *
 * If transaction already exists, update the value, otherwise add the new transaction
 */

const updateOrInsertTx = (txHistory: TxHistory, tx: Tx, accountId: AccountId) => {
  const { txs, hydrationMeta } = txHistory

  if (checkIsSpam(tx)) return

  const txIndex = serializeTxIndex(accountId, tx.txid, tx.pubkey, tx.data)

  const isNew = !txs.byId[txIndex]

  // update or insert tx
  txs.byId[txIndex] = tx

  // add id to ordered set for new tx
  if (isNew) {
    const orderedTxs = orderBy(txs.byId, 'blockTime', ['desc'])
    const index = orderedTxs.findIndex(
      tx => serializeTxIndex(accountId, tx.txid, tx.pubkey, tx.data) === txIndex,
    )
    txs.ids.splice(index, 0, txIndex)
  }

  // for a given tx, find all the related assetIds, and keep an index of
  // txids related to each asset id
  getRelatedAssetIds(tx).forEach(relatedAssetId =>
    deepUpsertArray(txs.byAccountIdAssetId, accountId, relatedAssetId, txIndex),
  )

  // update the min tx blocktime
  const hydrationMetadataForAccountId = hydrationMeta[accountId]
  if (
    hydrationMetadataForAccountId === undefined ||
    tx.blockTime < (hydrationMetadataForAccountId.minTxBlockTime ?? Infinity)
  ) {
    hydrationMeta[accountId] = {
      isHydrated: false,
      isErrored: false,
      minTxBlockTime: tx.blockTime,
    }
  }
}

const updateOrInsertTxs = (txHistory: TxHistory, incomingTxs: Tx[], accountId: AccountId) => {
  const { txs, hydrationMeta } = txHistory

  const filteredIncomingTxsWithIndex = incomingTxs
    .filter(tx => !checkIsSpam(tx))
    .map(tx => {
      const txIndex = serializeTxIndex(accountId, tx.txid, tx.pubkey, tx.data)
      return { tx, txIndex }
    })

  let minTxBlockTime = Infinity

  for (const { txIndex, tx } of filteredIncomingTxsWithIndex) {
    if (minTxBlockTime > tx.blockTime) {
      minTxBlockTime = tx.blockTime
    }

    const isNew = !txs.byId[txIndex]

    if (!isNew) continue

    // update or insert tx
    txs.byId[txIndex] = tx

    // for a given tx, find all the related assetIds, and keep an index of
    // txids related to each asset id
    getRelatedAssetIds(tx).forEach(relatedAssetId =>
      deepUpsertArray(txs.byAccountIdAssetId, accountId, relatedAssetId, txIndex),
    )
  }

  const getBlockTime = ([_, tx]: [string, Tx]) => tx.blockTime
  txs.ids = orderBy(Object.entries(txs.byId), getBlockTime, 'desc').map(([txIndex, _]) => txIndex)

  // update the min tx block time if required
  const hydrationMetadataForAccountId = hydrationMeta[accountId]
  if (
    minTxBlockTime < Infinity &&
    (hydrationMetadataForAccountId === undefined ||
      minTxBlockTime < (hydrationMetadataForAccountId.minTxBlockTime ?? Infinity))
  ) {
    hydrationMeta[accountId] = {
      isHydrated: false,
      isErrored: false,
      minTxBlockTime,
    }
  }
}

const checkTxHashReceived = (state: ReduxState, txHash: string) => {
  return state.txHistory.txs.ids.some(txIndex => deserializeTxIndex(txIndex).txid === txHash)
}

// Resolves when a tx with a given txhash has been received. Used for signalling tx completion only.
// Ignores the fact that there may be multiple txs received for a given txhash (thorchain swapper).
export const waitForTransactionHash = createAsyncThunk<
  void,
  string,
  { state: ReduxState; extra: { subscribe: (listener: (state: ReduxState) => void) => () => void } }
>('txHistory/waitForTransaction', (txHash, { getState, extra: { subscribe } }) => {
  return new Promise(resolve => {
    const transactionReceived = checkTxHashReceived(getState(), txHash)

    // don't subscribe if the tx was already received - prevents race condition and infinite await
    if (transactionReceived) {
      resolve()
      return
    }

    const unsubscribe = subscribe(state => {
      const transactionReceived = checkTxHashReceived(state, txHash)
      if (transactionReceived) {
        unsubscribe()
        resolve()
      }
    })
  })
})

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
  },
  extraReducers: builder => {
    builder.addCase(PURGE, () => initialState)
  },
})

export const txHistoryApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'txHistoryApi',
  endpoints: build => ({
    getAllTxHistory: build.query<null, AccountId[]>({
      queryFn: async (accountIds, { dispatch, getState }) => {
        const requestQueue = new PQueue({ concurrency: 2 })
        await Promise.all(
          accountIds.map(async accountId => {
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

                const requestCursor = currentCursor
                const { cursor, transactions } = await adapter.getTxHistory({
                  cursor: requestCursor,
                  pubkey,
                  pageSize,
                  requestQueue,
                })

                const state = getState() as State
                const txsById = state.txHistory.txs.byId

                // TODO: Another edge case exists where the status of a transaction has changed since it was last cached.
                // We'll need to re-fetch all transactions in history which aren't completed (success or fail) to updated them.
                const hasTx = transactions.some(
                  tx =>
                    txsById[serializeTxIndex(accountId, tx.txid, tx.pubkey, tx.data)] !== undefined,
                )

                const results: TransactionsByAccountId = { [accountId]: transactions }
                dispatch(txHistory.actions.upsertTxsByAccountId(results))

                /**
                 * We have run into a transaction that already exists in the store, stop fetching more history
                 *
                 * TODO: An edge case exists if there was an error fetching transaction history after at least one page was fetched.
                 * We will think we ran into the latest existing transaction in the store and stop fetching,
                 * but all transaction history after the failed response on the initial `getAllTxHistory` call will still be missing.
                 *
                 * We should be able to use state.txHistory.hydrationMetadata[accountId].isErrored to trigger a refetch in this instance.
                 */
                if (hasTx) break

                currentCursor = cursor
              } while (currentCursor)

              // Mark this account as hydrated so downstream can determine the difference between an
              // account starting part-way thru a time period and "still hydrating".
              dispatch(txHistory.actions.setAccountIdHydrated(accountId))
            } catch (err) {
              console.error(err)
              dispatch(txHistory.actions.setAccountIdErrored(accountId))
            }
          }),
        )

        return { data: null }
      },
    }),
  }),
})
