import { CAIP19 } from '@shapeshiftoss/caip'
import intersection from 'lodash/intersection'
import isEqual from 'lodash/isEqual'
import last from 'lodash/last'
import values from 'lodash/values'
import { createSelector } from 'reselect'
import { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import { AccountSpecifier } from '../accountSpecifiersSlice/accountSpecifiersSlice'
import { Tx, TxId, TxIdByAssetId } from './txHistorySlice'

export const selectTxs = (state: ReduxState) => state.txHistory.txs.byId
export const selectTxIds = (state: ReduxState) => state.txHistory.txs.ids
export const selectTxHistoryStatus = (state: ReduxState) => state.txHistory.txs.status
export const selectTxIdsByAccountId = (state: ReduxState) => state.txHistory.txs.byAccountId

const selectAccountIdsParam = (_state: ReduxState, accountIds: AccountSpecifier[]) => accountIds
const selectTxIdsParam = (_state: ReduxState, txIds: TxId[]) => txIds

export const selectTxsByAccountIds = createSelector(
  selectTxs,
  selectTxIdsByAccountId,
  selectAccountIdsParam,
  (txsById, txsByAccountId, accountIds): Tx[] => {
    if (!accountIds?.length) {
      return values(selectTxs)
    } else {
      return Object.entries(txsByAccountId)
        .reduce<TxId[]>((acc, [accountId, txIds]) => {
          if (accountIds.includes(accountId)) acc.push(...txIds)
          return acc
        }, [])
        .map(txId => txsById[txId])
    }
  },
  // deep equality check on output as we're mapping
  { memoizeOptions: { resultEqualityCheck: isEqual } },
)

export const selectLastNTxIds = createSelector(
  // ids will always change
  selectTxIds,
  (_state: ReduxState, count: number) => count,
  (ids, count) => ids.slice(0, count),
  // https://github.com/reduxjs/reselect#createselectorinputselectors--inputselectors-resultfunc-selectoroptions
  // we're doing a deel equality check on the output
  // meaning the selector returns the same array ref
  // regardless of if the input has changed
  { memoizeOptions: { resultEqualityCheck: isEqual } },
)

export const selectTxById = createSelector(
  (state: ReduxState) => state.txHistory.txs.byId,
  (_state: ReduxState, txId: string) => txId,
  (txsById, txId) => txsById[txId],
)

export const selectTxDateByIds = createDeepEqualOutputSelector(
  selectTxIdsParam,
  selectTxs,
  (txIds: TxId[], txs) =>
    txIds
      .map((txId: TxId) => ({ txId, date: txs[txId].blockTime }))
      .sort((a, b) => b.date - a.date),
)

type TxHistoryPageFilter = {
  fromDate: number | null
  toDate: number | null
  types: string[] | null
  matchingAssets: CAIP19[] | null
}

const selectDateParamFromFilter = (
  _state: ReduxState,
  { fromDate, toDate }: TxHistoryPageFilter,
) => ({ fromDate, toDate })

const selectTransactionTypesParamFromFilter = (
  _state: ReduxState,
  { types }: TxHistoryPageFilter,
) => types ?? []

const selectMatchingAssetsParamFromFilter = (
  _state: ReduxState,
  { matchingAssets }: TxHistoryPageFilter,
) => matchingAssets

export const selectTxIdsBasedOnSearchTermAndFilters = createDeepEqualOutputSelector(
  selectTxs,
  selectTxIds,
  selectMatchingAssetsParamFromFilter,
  selectDateParamFromFilter,
  selectTransactionTypesParamFromFilter,
  (txs, txIds, matchingAssets, { fromDate, toDate }, types): TxId[] => {
    if (!matchingAssets && !fromDate && !toDate && !types.length) return txIds
    const transactions = Object.entries(txs)
    const filteredBasedOnFromDate = fromDate
      ? transactions.filter(([, tx]) => tx.blockTime > fromDate).map(([txId]) => txId)
      : txIds
    const filteredBasedOnToDate = toDate
      ? transactions.filter(([, tx]) => tx.blockTime < toDate).map(([txId]) => txId)
      : txIds
    const filteredBasedOnMatchingAssets = matchingAssets
      ? transactions
          .filter(([, tx]) =>
            tx.transfers.find(transfer => matchingAssets.includes(transfer.caip19)),
          )
          .map(([txId]) => txId)
      : txIds
    const filteredBasedOnType = types.length
      ? transactions
          .filter(([, tx]) => {
            if (tx.transfers.length === 1) return types.includes(tx.transfers[0].type)
            if (tx.tradeDetails) return types.includes(tx.tradeDetails.type)
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
)

export const selectTxsByAssetId = (state: ReduxState) => state.txHistory.txs.byAssetId

const selectAssetIdParam = (_state: ReduxState, assetId: CAIP19) => assetId

const selectTxIdsByAssetId = createSelector(
  selectTxsByAssetId,
  selectAssetIdParam,
  (txsByAssetId: TxIdByAssetId, assetId): string[] => txsByAssetId[assetId] ?? [],
)

type TxHistoryFilter = {
  assetIds: CAIP19[]
  accountIds?: AccountSpecifier[]
}

const selectAssetIdsParamFromFilter = (_state: ReduxState, { assetIds }: TxHistoryFilter) =>
  assetIds
const selectAccountIdsParamFromFilter = (_state: ReduxState, { accountIds }: TxHistoryFilter) =>
  accountIds ?? []

export const selectTxIdsByFilter = createSelector(
  selectTxsByAssetId,
  selectTxIdsByAccountId,
  selectAssetIdsParamFromFilter,
  selectAccountIdsParamFromFilter,
  (txsByAssetId, txsByAccountId, assetIds, accountIds): TxId[] => {
    const assetTxIds = assetIds.map(assetId => txsByAssetId[assetId] ?? []).flat()
    // because the same tx can be related to multiple assets, e.g.
    // a FOX airdrop claim has an eth fee, after we combine the ids we need to dedupe them
    if (!accountIds.length) return Array.from(new Set([...assetTxIds]))
    const accountsTxIds = accountIds.map(accountId => txsByAccountId[accountId]).flat()
    return intersection(accountsTxIds, assetTxIds)
  },
  { memoizeOptions: { resultEqualityCheck: isEqual } },
)

export const selectTxsByFilter = createSelector(selectTxs, selectTxIdsByFilter, (txs, txIds) =>
  txIds.map(txId => txs[txId]),
)

// this is only used on trade confirm - new txs will be pushed
// to the end of this array, so last is guaranteed to be latest
// this can return undefined as we may be trading into this asset
// for the first time
export const selectLastTxStatusByAssetId = createSelector(
  selectTxIdsByAssetId,
  selectTxs,
  (txIdsByAssetId, txs): Tx['status'] | undefined => txs[last(txIdsByAssetId) ?? '']?.status,
)

const selectRebasesById = (state: ReduxState) => state.txHistory.rebases.byId
export const selectRebasesByAssetId = (state: ReduxState) => state.txHistory.rebases.byAssetId
export const selectRebaseIdsByAccountId = (state: ReduxState) => state.txHistory.rebases.byAccountId

export const selectRebaseIdsByFilter = createDeepEqualOutputSelector(
  selectRebasesByAssetId,
  selectRebaseIdsByAccountId,
  selectAssetIdsParamFromFilter,
  selectAccountIdsParamFromFilter,
  (rebasesByAssetId, rebaseIdsByAccountId, assetIds, accountIds) => {
    // all rebase ids by accountId, may include dupes
    const rebaseIds = assetIds.map(assetId => rebasesByAssetId[assetId] ?? []).flat()
    // if we're not filtering on account, return deduped rebase ids for given assets
    if (!accountIds.length) return Array.from(new Set([...rebaseIds]))
    const accountRebaseIds = accountIds.map(accountId => rebaseIdsByAccountId[accountId]).flat()
    return intersection(accountRebaseIds, rebaseIds)
  },
)

export const selectRebasesByFilter = createSelector(
  selectRebasesById,
  selectRebaseIdsByFilter,
  (rebasesById, rebaseIds) => rebaseIds.map(rebaseId => rebasesById[rebaseId]),
)
