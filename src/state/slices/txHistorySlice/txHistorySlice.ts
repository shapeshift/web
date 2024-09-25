import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId, isNft, thorchainChainId } from '@shapeshiftoss/caip'
import type { ChainAdapter, thorchain, Transaction } from '@shapeshiftoss/chain-adapters'
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
        await Promise.all(
          accountIds.map(async accountId => {
            // DO NOT MOVE ME OUTSIDE OF THIS SCOPE
            // This is a queue, and having a shared queue across AccountIds means a failure in one AccountId may be caught in another,
            // meaning a happy account may be detected as errored, while the actual errored one won't.
            const requestQueue = new PQueue({ concurrency: 2 })
            const { chainId, account: pubkey } = fromAccountId(accountId)
            const adapter = getChainAdapterManager().get(chainId)

            if (!adapter) {
              const data = `getAllTxHistory: no adapter available for chainId ${chainId}`
              return { error: { data, status: 400 } }
            }

            const fetch = async (getTxHistoryFns: ChainAdapter<ChainId>['getTxHistory'][]) => {
              for await (const getTxHistory of getTxHistoryFns) {
                try {
                  let currentCursor = ''

                  do {
                    const pageSize = 10
                    const requestCursor = currentCursor

                    const { cursor, transactions } = await getTxHistory({
                      cursor: requestCursor,
                      pubkey,
                      pageSize,
                      requestQueue,
                    })

                    const state = getState() as State
                    const txsById = state.txHistory.txs.byId

                    const hasTx = transactions.some(
                      tx => !!txsById[serializeTxIndex(accountId, tx.txid, tx.pubkey, tx.data)],
                    )

                    const results: TransactionsByAccountId = { [accountId]: transactions }
                    dispatch(txHistory.actions.upsertTxsByAccountId(results))

                    /**
                     * We have run into a transaction that already exists in the store, stop fetching more history
                     *
                     * Two edge cases exist currently:
                     *
                     * 1) If there was an error fetching transaction history after at least one page was fetched,
                     * the user would be missing all transactions thereafter. The next time we fetch tx history,
                     * we will think we ran into the latest existing transaction in the store and stop fetching.
                     * This means we will never upsert those missing transactions until the cache is cleared and
                     * they are successfully fetched again.
                     *
                     * We should be able to use state.txHistory.hydrationMetadata[accountId].isErrored to trigger a refetch in this instance.
                     *
                     * 2) Cached pending transactions will not be updated to completed if they are older than the
                     * last page found containing cached transactions.
                     *
                     * We can either invalidate tx history and refetch all, or refetch on a per transaction basis any cached pending txs
                     */
                    if (hasTx) return

                    currentCursor = cursor
                  } while (currentCursor)

                  // Mark this account as hydrated so downstream can determine the difference between an
                  // account starting part-way thru a time period and "still hydrating".
                  dispatch(txHistory.actions.setAccountIdHydrated(accountId))
                } catch (err) {
                  console.trace()
                  console.error(err)
                  dispatch(txHistory.actions.setAccountIdErrored(accountId))
                }
              }
            }

            if (chainId === thorchainChainId) {
              // fetch transaction history for both thorchain-1 (mainnet) and thorchain-mainnet-v1 (legacy)
              await fetch([
                adapter.getTxHistory.bind(adapter),
                (adapter as thorchain.ChainAdapter).getTxHistoryV1.bind(adapter),
              ])
            } else {
              await fetch([adapter.getTxHistory.bind(adapter)])
            }
          }),
        )

        return { data: null }
      },
    }),
  }),
})
