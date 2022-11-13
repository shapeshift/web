import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethChainId, fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import type { Transaction } from '@shapeshiftoss/chain-adapters'
import type { RebaseHistory } from '@shapeshiftoss/investor-foxy'
import { foxyAddresses } from '@shapeshiftoss/investor-foxy'
import type { UtxoAccountType } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import orderBy from 'lodash/orderBy'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { logger } from 'lib/logger'
import type { PartialRecord } from 'lib/utils'
import { deepUpsertArray, isSome } from 'lib/utils'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import { getFoxyApi } from 'state/apis/foxy/foxyApiSingleton'
import type { Nominal } from 'types/common'

import { getRelatedAssetIds, serializeTxIndex, UNIQUE_TX_ID_DELIMITER } from './utils'

const moduleLogger = logger.child({ namespace: ['txHistorySlice'] })

export type TxId = Nominal<string, 'TxId'>
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

export type TxIdsByAssetId = PartialRecord<AssetId, TxId[]>
export type TxIdsByAccountIdAssetId = PartialRecord<AccountId, TxIdsByAssetId>

// status is loading until all tx history is fetched
export type TxHistoryStatus = 'loading' | 'loaded'

export type RebaseId = Nominal<string, 'RebaseId'>
type RebaseById = PartialRecord<RebaseId, RebaseHistory>

type RebaseIdsByAssetId = PartialRecord<AssetId, RebaseId[]>
type RebaseIdsByAccountIdAssetId = PartialRecord<AccountId, RebaseIdsByAssetId>

export type TxsState = {
  byId: TxHistoryById
  byAccountIdAssetId: TxIdsByAccountIdAssetId
  ids: TxId[]
  status: TxHistoryStatus
}

export type RebasesState = {
  byAccountIdAssetId: RebaseIdsByAccountIdAssetId
  ids: RebaseId[]
  byId: RebaseById
}

export type TxHistory = {
  txs: TxsState
  rebases: RebasesState
}

export type TxMessage = { payload: { message: Tx; accountId: AccountId } }
export type TxsMessage = {
  payload: { txs: Transaction[]; accountId: AccountId }
}

const initialState: TxHistory = {
  txs: {
    byAccountIdAssetId: {},
    byId: {},
    ids: [], // sorted, newest first
    status: 'loaded', // TODO(0xdef1cafe): remove this
  },
  rebases: {
    byAccountIdAssetId: {},
    ids: [],
    byId: {},
  },
}

/**
 * Manage state of the txHistory slice
 *
 * If transaction already exists, update the value, otherwise add the new transaction
 */

const updateOrInsertTx = (txHistory: TxHistory, tx: Tx, accountId: AccountId) => {
  const { txs } = txHistory
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

type UpdateOrInsertRebase = (txState: TxHistory, data: RebaseHistoryPayload['payload']) => void

const updateOrInsertRebase: UpdateOrInsertRebase = (txState, payload) => {
  const { accountId, assetId } = payload
  const { rebases } = txState
  payload.data.forEach(rebase => {
    const rebaseId = makeRebaseId({ accountId, assetId, rebase })
    const isNew = !txState.rebases.byId[rebaseId]

    rebases.byId[rebaseId] = rebase

    if (isNew) {
      const orderedRebases = orderBy(rebases.byId, 'blockTime', ['desc']).filter(isSome)
      const index = orderedRebases.findIndex(
        rebase => makeRebaseId({ accountId, assetId, rebase }) === rebaseId,
      )
      rebases.ids.splice(index, 0, rebaseId)
    }

    deepUpsertArray(rebases.byAccountIdAssetId, accountId, assetId, rebaseId)
  })
}

type MakeRebaseIdArgs = {
  accountId: AccountId
  assetId: AssetId
  rebase: RebaseHistory
}

type MakeRebaseId = (args: MakeRebaseIdArgs) => string

const makeRebaseId: MakeRebaseId = ({ accountId, assetId, rebase }) =>
  [accountId, assetId, rebase.blockTime].join(UNIQUE_TX_ID_DELIMITER)

type TxHistoryStatusPayload = { payload: TxHistoryStatus }
type RebaseHistoryPayload = {
  payload: {
    accountId: AccountId
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
      updateOrInsertTx(txState, payload.message, payload.accountId),
    upsertTxs: (txState, { payload }: TxsMessage) => {
      for (const tx of payload.txs) updateOrInsertTx(txState, tx, payload.accountId)
    },
    upsertRebaseHistory: (txState, { payload }: RebaseHistoryPayload) =>
      updateOrInsertRebase(txState, payload),
  },
})

type RebaseTxHistoryArgs = {
  accountId: AccountId
  portfolioAssetIds: AssetId[]
}

export const txHistoryApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'txHistoryApi',
  endpoints: build => ({
    getFoxyRebaseHistoryByAccountId: build.query<RebaseHistory[], RebaseTxHistoryArgs>({
      queryFn: async ({ accountId, portfolioAssetIds }, { dispatch }) => {
        const { chainId, account: userAddress } = fromAccountId(accountId)
        // foxy is only on eth mainnet, and [] is a valid return type and won't upsert anything
        if (chainId !== ethChainId) return { data: [] }
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

        // setup foxy api
        const foxyApi = getFoxyApi()

        await Promise.all(
          foxyTokenContractAddressWithBalances.map(async tokenContractAddress => {
            const rebaseHistoryArgs = { userAddress, tokenContractAddress }
            const data = await foxyApi.getRebaseHistory(rebaseHistoryArgs)
            const assetReference = tokenContractAddress
            const assetNamespace = 'erc20'
            const assetId = toAssetId({ chainId, assetNamespace, assetReference })
            const upsertPayload = { accountId, assetId, data }
            if (data.length) dispatch(txHistory.actions.upsertRebaseHistory(upsertPayload))
          }),
        )

        // we don't really care about the caching of this, we're dispatching
        // into another part of the portfolio above, we kind of abuse RTK query,
        // and we're always force refetching these anyway
        return { data: [] }
      },
    }),
    getAllTxHistory: build.query<Transaction[], AccountId[]>({
      queryFn: async (accountIds, { dispatch }) => {
        if (!accountIds.length) {
          return { error: { data: 'getAllTxHistory: no account ids provided', status: 400 } }
        }

        const txHistories = await Promise.allSettled(
          accountIds.map(async accountId => {
            const { chainId, account: pubkey } = fromAccountId(accountId)
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

                dispatch(txHistory.actions.upsertTxs({ txs: transactions, accountId }))
              } while (currentCursor)
            } catch (err) {
              throw new Error(`failed to fetch tx history for account: ${accountId}: ${err}`)
            }
          }),
        )

        txHistories.forEach(promise => {
          if (promise.status === 'rejected') {
            moduleLogger.child({ fn: 'getAllTxHistory' }).error(promise.reason)
          }
        })

        dispatch(txHistory.actions.setStatus('loaded'))

        return { data: [] }
      },
    }),
  }),
})
