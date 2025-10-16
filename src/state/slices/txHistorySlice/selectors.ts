import { QueryStatus } from '@reduxjs/toolkit/query'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { arbitrumChainId, fromAccountId } from '@shapeshiftoss/caip'
import type { TxTransfer } from '@shapeshiftoss/chain-adapters'
import type { AccountMetadata } from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import type { common } from '@shapeshiftoss/unchained-client'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import intersection from 'lodash/intersection'
import isEmpty from 'lodash/isEmpty'
import pickBy from 'lodash/pickBy'
import uniq from 'lodash/uniq'
import values from 'lodash/values'
import { matchSorter } from 'match-sorter'
import createCachedSelector from 're-reselect'
import { createSelector } from 'reselect'

import { selectAssets } from '../assetsSlice/selectors'
import { selectEnabledWalletAccountIds } from '../common-selectors'
import { selectPortfolioAccountMetadata } from '../portfolioSlice/selectors'
import type { Tx, TxId, TxIdsByAccountIdAssetId } from './txHistorySlice'
import { txHistory } from './txHistorySlice'

import { getTimeFrameBounds, isSome } from '@/lib/utils'
import type { ReduxState } from '@/state/reducer'
import { createDeepEqualOutputSelector } from '@/state/selector-utils'
import {
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  selectChainIdParamFromFilter,
  selectMemoParamFromFilter,
  selectOriginMemoParamFromFilter,
  selectParserParamFromFilter,
  selectSearchQueryFromFilter,
  selectTimeframeParamFromFilter,
  selectTxHashParamFromFilter,
  selectTxStatusParamFromFilter,
} from '@/state/selectors'

const selectTxHistoryApiQueries = (state: ReduxState) => state.txHistoryApi.queries
export const selectIsAnyTxHistoryApiQueryPending = createDeepEqualOutputSelector(
  selectTxHistoryApiQueries,
  queries => Object.values(queries).some(query => query?.status === QueryStatus.pending),
)

export const selectTxs = createDeepEqualOutputSelector(
  txHistory.selectors.selectTxsById,
  byId => byId,
)
export const selectTxIds = createDeepEqualOutputSelector(
  txHistory.selectors.selectTxIds,
  ids => ids,
)

const selectTxIdParam = createCachedSelector(
  (_state: ReduxState, txId: string) => txId,
  txId => txId,
)((_state: ReduxState, txId: TxId | undefined): TxId => txId ?? 'undefined')

const selectTxIdsParam = createDeepEqualOutputSelector(
  (_state: ReduxState, txIds: TxId[]) => txIds,
  txIds => txIds,
)

export const selectTxById = createCachedSelector(
  selectTxs,
  selectTxIdParam,
  (txsById, txId): Tx | undefined => txsById[txId],
)({
  keySelector: (_txsById, txId: TxId | undefined): TxId => txId ?? 'undefined',
  selectorCreator: createDeepEqualOutputSelector,
})

export const selectTxDateByIds = createDeepEqualOutputSelector(
  selectTxIdsParam,
  selectTxs,
  (txIds: TxId[], txs) =>
    txIds
      .filter((txId: TxId) => txs[txId] !== undefined)
      .map((txId: TxId) => ({ txId, date: txs[txId].blockTime }))
      .sort((a, b) => b.date - a.date),
)

type TxHistoryPageFilter = {
  fromDate: number | null
  toDate: number | null
  types: string[] | null
  matchingAssets: AssetId[] | null
}

const selectDateParamFromFilter = (_state: ReduxState, filter: TxHistoryPageFilter) => ({
  fromDate: filter?.fromDate,
  toDate: filter?.toDate,
})

const selectTransactionTypesParamFromFilter = (_state: ReduxState, filter: TxHistoryPageFilter) =>
  filter?.types ?? []

const selectMatchingAssetsParamFromFilter = (_state: ReduxState, filter: TxHistoryPageFilter) =>
  filter?.matchingAssets

const selectWalletTxIdsByAccountIdAssetId = createSelector(
  selectEnabledWalletAccountIds,
  txHistory.selectors.selectTxIdsByAccountIdAssetId,
  (accountIds, txsByAccountIdAssetId): TxIdsByAccountIdAssetId =>
    pickBy(txsByAccountIdAssetId, (_, accountId) => accountIds.includes(accountId)),
)

export const selectArbitrumWithdrawTxs = createSelector(
  selectTxIds,
  selectTxs,
  selectWalletTxIdsByAccountIdAssetId,
  (txIds, txs, data): Tx[] => {
    const arbitrumData = pickBy(
      data,
      (_, accountId) => fromAccountId(accountId).chainId === arbitrumChainId,
    )

    const arbitrumTxIds = values(arbitrumData)
      .flatMap(data => values(data).flat())
      .filter(isSome)

    const sortedArbitrumTxIds = uniq(arbitrumTxIds).sort(
      (a, b) => txIds.indexOf(a) - txIds.indexOf(b),
    )

    return sortedArbitrumTxIds.reduce<Tx[]>((prev, txid) => {
      const tx = txs[txid]

      if (
        tx.data?.parser === 'arbitrumBridge' &&
        ['outboundTransfer', 'withdrawEth'].includes(tx.data?.method ?? '')
      ) {
        prev.push(tx)
      }

      return prev
    }, [])
  },
)

export const selectTxIdsByFilter = createCachedSelector(
  selectTxIds,
  selectTxs,
  selectWalletTxIdsByAccountIdAssetId,
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  selectTxStatusParamFromFilter,
  selectParserParamFromFilter,
  selectMemoParamFromFilter,
  selectOriginMemoParamFromFilter,
  selectTxHashParamFromFilter,
  (
    txIds,
    txs,
    data,
    accountIdFilter,
    assetIdFilter,
    txStatusFilter,
    parserFilter,
    memoFilter,
    originMemoFilter,
    txHashFilter,
  ): TxId[] => {
    const maybeFilteredByAccountId = accountIdFilter
      ? pickBy(data, (_, accountId) => {
          return accountId === accountIdFilter
        })
      : data
    const flattened = values(maybeFilteredByAccountId)
      .flatMap(byAssetId => (assetIdFilter ? byAssetId?.[assetIdFilter] : values(byAssetId).flat()))
      .filter(isSome)
    const uniqueIds = uniq(flattened)
    const maybeFilteredByParser = parserFilter
      ? uniqueIds.filter(txId => txs[txId].data?.parser === parserFilter)
      : uniqueIds

    const maybeFilteredByMemo = memoFilter
      ? maybeFilteredByParser.filter(
          txId =>
            (txs[txId].data as common.thormaya.TxMetadata | undefined)?.memo?.startsWith(
              memoFilter,
            ),
        )
      : maybeFilteredByParser

    const maybeFilteredByOriginMemo = originMemoFilter
      ? maybeFilteredByMemo.filter(
          txId =>
            (txs[txId].data as common.thormaya.TxMetadata | undefined)?.originMemo?.startsWith(
              originMemoFilter,
            ),
        )
      : maybeFilteredByMemo

    const maybeFilteredByTxHash = txHashFilter
      ? maybeFilteredByOriginMemo.filter(txId => {
          const txIdNormalized = txs[txId].txid.toLowerCase().replace(/^0x/, '')
          const filterNormalized = txHashFilter.toLowerCase().replace(/^0x/, '')
          return txIdNormalized.startsWith(filterNormalized)
        })
      : maybeFilteredByOriginMemo

    const maybeUniqueIdsByStatus = txStatusFilter
      ? maybeFilteredByTxHash.filter(txId => txs[txId].status === txStatusFilter)
      : maybeFilteredByTxHash
    const sortedIds = maybeUniqueIdsByStatus.sort((a, b) => txIds.indexOf(a) - txIds.indexOf(b))
    return sortedIds
  },
)((_state: ReduxState, filter) =>
  filter
    ? `${filter.accountId ?? 'accountId'}-${filter.txStatus ?? 'txStatus'}-${
        filter.assetId ?? 'assetId'
      }`
    : 'txIdsByFilter',
)

export const selectTxIdsByFilterWithPendingFirst = createCachedSelector(
  selectTxs,
  selectTxIdsByFilter,
  (txs, filteredTxIds): TxId[] => {
    return [...filteredTxIds].sort((a, b) => {
      if (txs[a].status === TxStatus.Pending && txs[b].status !== TxStatus.Pending) return -1
      if (txs[b].status === TxStatus.Pending && txs[a].status !== TxStatus.Pending) return 1

      return 0
    })
  },
)((_state: ReduxState, filter) =>
  filter
    ? `${filter.accountId ?? 'accountId'}-${filter.txStatus ?? 'txStatus'}-${
        filter.assetId ?? 'assetId'
      }`
    : 'txIdsByFilterWithPendingFirst',
)

export const selectTxIdsBasedOnSearchTermAndFilters = createCachedSelector(
  selectTxs,
  selectTxIdsByFilter,
  selectMatchingAssetsParamFromFilter,
  selectDateParamFromFilter,
  selectTransactionTypesParamFromFilter,
  (txs, txIds, matchingAssets, { fromDate, toDate }, types): TxId[] => {
    if (!matchingAssets && fromDate === null && toDate === null && !types.length) return txIds
    const transactions = Object.entries(txs)
    const filteredBasedOnFromDate = fromDate !== null
      ? transactions.filter(([, tx]) => tx.blockTime > fromDate).map(([txId]) => txId)
      : txIds
    const filteredBasedOnToDate = toDate !== null
      ? transactions.filter(([, tx]) => tx.blockTime < toDate).map(([txId]) => txId)
      : txIds
    const filteredBasedOnMatchingAssets = matchingAssets
      ? transactions
          .filter(([, tx]) =>
            tx.transfers.find(transfer => matchingAssets.includes(transfer.assetId)),
          )
          .map(([txId]) => txId)
      : txIds
    const filteredBasedOnType = types.length
      ? transactions
          .filter(([, tx]) => {
            if (tx.transfers.length === 1) return types.includes(tx.transfers[0].type)
            if (tx.trade) return types.includes(tx.trade.type)
            return false
          })
          .map(([txId]) => txId)
      : txIds
    return intersection(
      filteredBasedOnFromDate,
      filteredBasedOnToDate,
      filteredBasedOnMatchingAssets,
      filteredBasedOnType,
    )
  },
)((_state: ReduxState, filter) =>
  filter
    ? `${filter.accountId ?? 'accountId'}-${filter.txStatus ?? 'txStatus'}-${
        filter.assetId ?? 'assetId'
      }-${filter.fromDate ?? 'fromDate'}-${filter.toDate ?? 'toDate'}-${filter.types ?? 'types'}-${
        filter.matchingAssets ?? 'matchingAssets'
      }`
    : 'txIdsBasedOnSearchTermAndFilters',
)

export const selectTxsByFilter = createCachedSelector(
  selectTxs,
  selectTxIdsByFilter,
  (txs, txIds) => {
    return txIds.map(txId => txs[txId])
  },
)((_state: ReduxState, filter) =>
  filter
    ? `${filter.accountId ?? 'accountId'}-${filter.txStatus ?? 'txStatus'}-${
        filter.assetId ?? 'assetId'
      }`
    : 'txsByFilter',
)

export const selectTxByFilter = createSelector(selectTxsByFilter, txs => {
  if (txs.length > 1 || !txs.length) return

  return txs[0]
})

/**
 * to be able to add an account for a chain, we want to ensure there is some tx history
 * on the current highest accountNumber accountIds
 *
 * note - there can be multiple accountIds sharing the same accountNumber - e.g. BTC legacy/segwit/segwit native
 * are all separate accounts that share the same account number
 */
export const selectMaybeNextAccountNumberByChainId = createCachedSelector(
  selectWalletTxIdsByAccountIdAssetId,
  selectPortfolioAccountMetadata,
  selectChainIdParamFromFilter,
  (txIdsByAccountId, accountMetadata, chainId): [boolean, number | null] => {
    // filter accounts by chain id
    const accountMetadataEntriesByChainId: [AccountId, AccountMetadata][] = Object.entries(
      accountMetadata,
    ).filter(([accountId, _metadata]) => fromAccountId(accountId).chainId === chainId)

    // grab the highest account number
    const currentHighestAccountNumber: number = Math.max(
      ...accountMetadataEntriesByChainId.map(([, { bip44Params }]) => bip44Params.accountNumber),
    )

    // filter for highest account number, and map back to accountIds
    const highestAccountNumberAccountsIds: AccountId[] = accountMetadataEntriesByChainId
      .filter(
        ([_accountId, { bip44Params }]) =>
          bip44Params.accountNumber === currentHighestAccountNumber,
      )
      .map(([accountId]) => accountId)

    // at least one of the account ids with the highest account number must have some tx history
    const isAbleToAddNextAccount = highestAccountNumberAccountsIds.some(
      accountId => !isEmpty(txIdsByAccountId[accountId]),
    )
    const nextAccountNumber = currentHighestAccountNumber + 1
    return [isAbleToAddNextAccount, isAbleToAddNextAccount ? nextAccountNumber : null]
  },
)((_state: ReduxState, filter) => filter?.chainId ?? 'undefined')

export const selectTxsByQuery = createCachedSelector(
  selectTxs,
  selectTxIdsByFilter,
  selectAssets,
  selectSearchQueryFromFilter,
  (txsById, txIds, assets, searchQuery): TxId[] => {
    // Txs do *not* have a guaranteed order, but txIds do (most recent first)
    // Ensure we honor the order of Txids when sorting Txs
    const txArray: [TxId, Tx][] = txIds.map(txId => [txId, txsById[txId]])

    if (!searchQuery) return txIds

    const results = matchSorter(txArray, searchQuery, {
      keys: [
        'txid',
        item =>
          item[1]?.transfers.flatMap((transfer: TxTransfer) => [
            assets[transfer.assetId]?.name ?? '',
            assets[transfer.assetId]?.symbol ?? '',
          ]),
        item => item[0],
      ],
      threshold: matchSorter.rankings.CONTAINS,
    })

    return results.map(result => result[0])
  },
)((_state: ReduxState, filter) =>
  filter
    ? `${filter.accountId ?? 'accountId'}-${filter.txStatus ?? 'txStatus'}-${
        filter.assetId ?? 'assetId'
      }-${filter.searchQuery ?? 'searchQuery'}`
    : 'txsByQuery',
)

export const selectIsTxHistoryAvailableByFilter = createCachedSelector(
  txHistory.selectors.selectHydrationMeta,
  selectEnabledWalletAccountIds,
  selectAccountIdParamFromFilter,
  selectTimeframeParamFromFilter,
  (hydrationMeta, walletAccountIds, accountId, timeframe) => {
    const { start } = getTimeFrameBounds(timeframe ?? HistoryTimeframe.ALL, 0)

    const checkIsTxHistoryAvailable = (accountId: AccountId) => {
      const hydrationMetaForAccount = hydrationMeta[accountId]

      // Completely missing account here likely means it's yet to be fetched
      if (hydrationMetaForAccount === undefined) {
        return false
      }

      const { isHydrated, minTxBlockTime, isErrored } = hydrationMetaForAccount

      // Ignore errored accounts and handle errored status in the UI layer
      if (isErrored) {
        return true
      }

      return isHydrated || (minTxBlockTime !== undefined && minTxBlockTime <= start.valueOf() / 1000)
    }

    // No account ID assumes "all" account IDs
    if (accountId === undefined) {
      const isTxHistoryAvailableForEveryAccount = walletAccountIds.every(checkIsTxHistoryAvailable)
      return isTxHistoryAvailableForEveryAccount
    }

    return checkIsTxHistoryAvailable(accountId)
  },
)((_state: ReduxState, filter) =>
  filter
    ? `${filter.accountId ?? 'accountId'}-${filter.timeframe ?? 'timeframe'}`
    : 'isTxHistoryAvailableByFilter',
)

export const selectErroredTxHistoryAccounts = createDeepEqualOutputSelector(
  txHistory.selectors.selectHydrationMeta,
  selectEnabledWalletAccountIds,
  (hydrationMeta, walletEnabledAccountIds) => {
    return Object.entries(hydrationMeta)
      .filter(([_accountId, hydrationMetaForAccountId]) => hydrationMetaForAccountId?.isErrored)
      .map(([accountId, _hydrationMetaForAccountId]) => accountId)
      .filter(accountId => walletEnabledAccountIds.includes(accountId))
  },
)
