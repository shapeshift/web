import type { AssetId } from '@keepkey/caip'
import { ethChainId, toAccountId, toAssetId } from '@keepkey/caip'
import type { Transaction } from '@keepkey/chain-adapters'
import type { RebaseHistory } from '@keepkey/investor-foxy'
import { foxyAddresses } from '@keepkey/investor-foxy'
import type { UtxoAccountType } from '@keepkey/types'
import { KnownChainIds } from '@keepkey/types'
import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import isEmpty from 'lodash/isEmpty'
import orderBy from 'lodash/orderBy'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { logger } from 'lib/logger'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import { getFoxyApi } from 'state/apis/foxy/foxyApiSingleton'
import type {
  AccountSpecifier,
  AccountSpecifierMap,
} from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'

import { addToIndex, getRelatedAssetIds, serializeTxIndex, UNIQUE_TX_ID_DELIMITER } from './utils'

const moduleLogger = logger.child({ namespace: ['txHistorySlice'] })

export type TxId = string
export type Tx = Transaction & { accountType?: UtxoAccountType }

export type TxHistoryById = {
  [k: TxId]: Tx
}

/* this is a one to many relationship of asset id to tx id
 *
 * e.g. an account with a single trade of FOX to USDC will produce the following
 * three related assets
 *
 * {
 *   foxAssetId: [txid] // sell asset
 *   usdcAssetId: [txid] // buy asset
 *   ethAssetId: [txid] // fee asset
 * }
 *
 * where txid is the same txid related to all the above assets, as the
 * sell asset, buy asset, and fee asset respectively
 *
 * this allows us to O(1) select all related transactions to a given asset
 */

export type TxIdByAssetId = {
  [k: AssetId]: TxId[]
}

export type TxIdByAccountId = {
  [k: AccountSpecifier]: TxId[]
}

// status is loading until all tx history is fetched
export type TxHistoryStatus = 'loading' | 'loaded'

type RebaseId = string
type RebaseById = {
  [k: RebaseId]: RebaseHistory
}

type RebaseByAssetId = {
  [k: AssetId]: RebaseId[]
}

type RebaseByAccountId = {
  [k: AccountSpecifier]: RebaseId[]
}

export type TxsState = {
  byId: TxHistoryById
  byAssetId: TxIdByAssetId
  byAccountId: TxIdByAccountId
  ids: TxId[]
  status: TxHistoryStatus
}

export type RebasesState = {
  byAssetId: RebaseByAssetId
  byAccountId: RebaseByAccountId
  ids: RebaseId[]
  byId: RebaseById
}

export type TxHistory = {
  txs: TxsState
  rebases: RebasesState
}

export type TxMessage = { payload: { message: Tx; accountSpecifier: string } }
export type TxsMessage = {
  payload: { txs: Transaction[]; accountSpecifier: string }
}

// https://redux.js.org/usage/structuring-reducers/normalizing-state-shape#designing-a-normalized-state
const initialState: TxHistory = {
  txs: {
    byId: {},
    ids: [], // sorted, newest first
    byAssetId: {},
    byAccountId: {},
    status: 'loading',
  },
  rebases: {
    byAssetId: {},
    byAccountId: {},
    ids: [],
    byId: {},
  },
}

/**
 * Manage state of the txHistory slice
 *
 * If transaction already exists, update the value, otherwise add the new transaction
 */

const updateOrInsertTx = (txHistory: TxHistory, tx: Tx, accountSpecifier: AccountSpecifier) => {
  const { txs } = txHistory
  const txIndex = serializeTxIndex(accountSpecifier, tx.txid, tx.address)

  const isNew = !txs.byId[txIndex]

  // update or insert tx
  txs.byId[txIndex] = tx

  // add id to ordered set for new tx
  if (isNew) {
    const orderedTxs = orderBy(txs.byId, 'blockTime', ['desc'])
    const index = orderedTxs.findIndex(
      tx => serializeTxIndex(accountSpecifier, tx.txid, tx.address) === txIndex,
    )
    txs.ids.splice(index, 0, txIndex)
  }

  // for a given tx, find all the related assetIds, and keep an index of
  // txids related to each asset id
  getRelatedAssetIds(tx).forEach(relatedAssetId => {
    txs.byAssetId[relatedAssetId] = addToIndex(
      txs.ids,
      txs.byAssetId[relatedAssetId],
      serializeTxIndex(accountSpecifier, tx.txid, tx.address),
    )
  })

  // index the tx by the account that it belongs to
  txs.byAccountId[accountSpecifier] = addToIndex(
    txs.ids,
    txs.byAccountId[accountSpecifier],
    serializeTxIndex(accountSpecifier, tx.txid, tx.address),
  )

  // ^^^ redux toolkit uses the immer lib, which uses proxies under the hood
  // this looks like it's not doing anything, but changes written to the proxy
  // get applied to state when it goes out of scope
}

type UpdateOrInsertRebase = (txState: TxHistory, data: RebaseHistoryPayload['payload']) => void

const updateOrInsertRebase: UpdateOrInsertRebase = (txState, payload) => {
  const { accountId, assetId } = payload
  const { rebases } = txState
  payload.data.forEach(rebase => {
    const rebaseId = makeRebaseId({ accountId, assetId, rebase })
    const isNew = !txState.rebases.byId[rebaseId]

    rebases.byId[rebaseId] = rebase

    if (isNew) {
      const orderedRebases = orderBy(rebases.byId, 'blockTime', ['desc'])
      const index = orderedRebases.findIndex(
        rebase => makeRebaseId({ accountId, assetId, rebase }) === rebaseId,
      )
      rebases.ids.splice(index, 0, rebaseId)
    }

    rebases.byAssetId[assetId] = addToIndex(
      rebases.ids,
      rebases.byAssetId[assetId],
      makeRebaseId({ accountId, assetId, rebase }),
    )

    // index the tx by the account that it belongs to
    rebases.byAccountId[accountId] = addToIndex(
      rebases.ids,
      rebases.byAccountId[accountId],
      makeRebaseId({ accountId, assetId, rebase }),
    )
  })

  // ^^^ redux toolkit uses the immer lib, which uses proxies under the hood
  // this looks like it's not doing anything, but changes written to the proxy
  // get applied to state when it goes out of scope
}

type MakeRebaseIdArgs = {
  accountId: AccountSpecifier
  assetId: AssetId
  rebase: RebaseHistory
}

type MakeRebaseId = (args: MakeRebaseIdArgs) => string

const makeRebaseId: MakeRebaseId = ({ accountId, assetId, rebase }) =>
  [accountId, assetId, rebase.blockTime].join(UNIQUE_TX_ID_DELIMITER)

type TxHistoryStatusPayload = { payload: TxHistoryStatus }
type RebaseHistoryPayload = {
  payload: {
    accountId: AccountSpecifier
    assetId: AssetId
    data: RebaseHistory[]
  }
}

export const txHistory = createSlice({
  name: 'txHistory',
  initialState,
  reducers: {
    clear: () => {
      moduleLogger.info('clearing tx history')
      return initialState
    },
    setStatus: (state, { payload }: TxHistoryStatusPayload) => {
      state.txs.status = payload
    },
    onMessage: (txState, { payload }: TxMessage) =>
      updateOrInsertTx(txState, payload.message, payload.accountSpecifier),
    upsertTxs: (txState, { payload }: TxsMessage) => {
      for (const tx of payload.txs) {
        updateOrInsertTx(txState, tx, payload.accountSpecifier)
      }
    },
    upsertRebaseHistory: (txState, { payload }: RebaseHistoryPayload) =>
      updateOrInsertRebase(txState, payload),
  },
})

type AllTxHistoryArgs = { accountSpecifiersList: AccountSpecifierMap[] }

type RebaseTxHistoryArgs = {
  accountSpecifierMap: AccountSpecifierMap
  portfolioAssetIds: AssetId[]
}

export const txHistoryApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'txHistoryApi',
  endpoints: build => ({
    getFoxyRebaseHistoryByAccountId: build.query<RebaseHistory[], RebaseTxHistoryArgs>({
      queryFn: async ({ accountSpecifierMap, portfolioAssetIds }, { dispatch }) => {
        // foxy contract address, note not assetIds
        const foxyTokenContractAddressWithBalances = foxyAddresses.reduce<string[]>(
          (acc, { foxy }) => {
            const contractAddress = foxy.toLowerCase()
            portfolioAssetIds.some(id => id.includes(contractAddress)) && acc.push(contractAddress)
            return acc
          },
          [],
        )

        // don't do anything below if we don't hold a version of foxy
        if (!foxyTokenContractAddressWithBalances.length) return { data: [] }

        // we load rebase history on app load, but pass in all the specifiers
        // foxy is only on eth mainnet
        const chainId = ethChainId
        const entries = Object.entries(accountSpecifierMap)[0]
        const [accountChainId, userAddress] = entries

        const accountSpecifier = toAccountId({ chainId, account: userAddress })
        // [] is a valid return type and won't upsert anything
        if (chainId !== accountChainId) return { data: [] }

        // setup chain adapters
        const adapters = getChainAdapterManager()
        if (![...adapters.keys()].includes(KnownChainIds.EthereumMainnet)) {
          const data = `getFoxyRebaseHistoryByAccountId: ChainAdapterManager does not support ${KnownChainIds.EthereumMainnet}`
          const status = 400
          const error = { data, status }
          return { error }
        }

        // setup foxy api
        const foxyApi = getFoxyApi()

        await Promise.all(
          foxyTokenContractAddressWithBalances.map(async tokenContractAddress => {
            const rebaseHistoryArgs = { userAddress, tokenContractAddress }
            const data = await foxyApi.getRebaseHistory(rebaseHistoryArgs)
            const assetReference = tokenContractAddress
            const assetNamespace = 'erc20'
            const assetId = toAssetId({ chainId, assetNamespace, assetReference })
            const upsertPayload = { accountId: accountSpecifier, assetId, data }
            if (data.length) dispatch(txHistory.actions.upsertRebaseHistory(upsertPayload))
          }),
        )

        // we don't really care about the caching of this, we're dispatching
        // into another part of the portfolio above, we kind of abuse RTK query,
        // and we're always force refetching these anyway
        return { data: [] }
      },
    }),
    getAllTxHistory: build.query<Transaction[], AllTxHistoryArgs>({
      queryFn: async ({ accountSpecifiersList }, { dispatch }) => {
        if (!accountSpecifiersList.length) {
          return { error: { data: 'getAllTxHistory: no account specifiers provided', status: 400 } }
        }

        for (const accountSpecifierMap of accountSpecifiersList) {
          if (isEmpty(accountSpecifierMap)) {
            moduleLogger.warn(
              { fn: 'getAllTxHistory', accountSpecifierMap },
              'no account specifiers provided',
            )
            continue
          }

          const txHistories = await Promise.allSettled(
            Object.entries(accountSpecifierMap).map(async ([chainId, pubkey]) => {
              const accountSpecifier = toAccountId({ chainId, account: pubkey })
              const adapter = getChainAdapterManager().get(chainId)
              if (!adapter)
                return {
                  error: {
                    data: `getAllTxHistory: no adapter available for chainId ${chainId}`,
                    status: 400,
                  },
                }

              const pageSize = (() => {
                switch (chainId) {
                  case KnownChainIds.AvalancheMainnet:
                    /**
                     * as of writing, the data source upstream from unchained can choke and timeout
                     * on a page size of 100 for avalanche tx history.
                     *
                     * using a larger number of smaller requests is a stopgap to prevent timeouts
                     * until we can address the root cause upstream.
                     */
                    return 10
                  default:
                    return 100
                }
              })()

              let currentCursor: string = ''
              try {
                do {
                  const { cursor, transactions } = await adapter.getTxHistory({
                    cursor: currentCursor,
                    pubkey,
                    pageSize,
                  })

                  currentCursor = cursor

                  dispatch(txHistory.actions.upsertTxs({ txs: transactions, accountSpecifier }))
                } while (currentCursor)
              } catch (err) {
                throw new Error(
                  `failed to fetch tx history for account: ${accountSpecifier}: ${err}`,
                )
              }
            }),
          )

          txHistories.forEach(promise => {
            if (promise.status === 'rejected') {
              moduleLogger.child({ fn: 'getAllTxHistory' }).error(promise.reason)
            }
          })
        }

        dispatch(txHistory.actions.setStatus('loaded'))

        return { data: [] }
      },
    }),
  }),
})
