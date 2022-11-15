import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { RebaseHistory } from '@shapeshiftoss/investor-foxy'
import intersection from 'lodash/intersection'
import isEmpty from 'lodash/isEmpty'
import pickBy from 'lodash/pickBy'
import uniq from 'lodash/uniq'
import values from 'lodash/values'
import createCachedSelector from 're-reselect'
import { createSelector } from 'reselect'
import { isSome } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import {
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  selectChainIdParamFromFilter,
} from 'state/selectors'

import type { AccountMetadata } from '../portfolioSlice/portfolioSliceCommon'
import { selectPortfolioAccountMetadata, selectWalletAccountIds } from '../portfolioSlice/selectors'
import type {
  RebaseId,
  RebaseIdsByAccountIdAssetId,
  Tx,
  TxId,
  TxIdsByAccountIdAssetId,
} from './txHistorySlice'

export const selectTxs = createDeepEqualOutputSelector(
  (state: ReduxState) => state.txHistory.txs.byId,
  byId => byId,
)
export const selectTxIds = createDeepEqualOutputSelector(
  (state: ReduxState) => state.txHistory.txs.ids,
  ids => ids,
)

const selectRebasesById = (state: ReduxState) => state.txHistory.rebases.byId
export const selectRebaseIds = createDeepEqualOutputSelector(
  (state: ReduxState) => state.txHistory.rebases.ids,
  ids => ids,
)

export const selectTxHistoryStatus = (state: ReduxState) => state.txHistory.txs.status

export const selectIsTxHistoryLoading = createSelector(
  selectTxHistoryStatus,
  (txHistoryStatus): boolean => txHistoryStatus === 'loading',
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
  (txsById, txId) => txsById[txId],
)({
  keySelector: (_txsById, txId: TxId | undefined): TxId => txId ?? 'undefined',
  selectorCreator: createDeepEqualOutputSelector,
})

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
)

const selectWalletTxsByAccountIdAssetId = createSelector(
  selectWalletAccountIds,
  (state: ReduxState) => state.txHistory.txs.byAccountIdAssetId,
  (accountIds, txsByAccountIdAssetId): TxIdsByAccountIdAssetId =>
    pickBy(txsByAccountIdAssetId, (_, accountId) => accountIds.includes(accountId)),
)

const selectWalletRebasesByAccountIdAssetId = createSelector(
  selectWalletAccountIds,
  (state: ReduxState) => state.txHistory.rebases.byAccountIdAssetId,
  (accountIds, rebasesByAccountIdAssetId): RebaseIdsByAccountIdAssetId =>
    pickBy(rebasesByAccountIdAssetId, (_, accountId) => accountIds.includes(accountId)),
)

export const selectTxIdsByFilter = createDeepEqualOutputSelector(
  selectTxIds,
  selectWalletTxsByAccountIdAssetId,
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  (txIds, data, accountIdFilter, assetIdFilter): TxId[] => {
    // filter by accountIdFilter, if it exists, otherwise data for all accountIds
    const filtered = pickBy(data, (_, accountId) =>
      accountIdFilter ? accountId === accountIdFilter : true,
    )
    const flattened = values(filtered)
      .flatMap(byAssetId => (assetIdFilter ? byAssetId?.[assetIdFilter] : values(byAssetId).flat()))
      .filter(isSome)
    const uniqueIds = uniq(flattened)
    const sortedIds = uniqueIds.sort((a, b) => txIds.indexOf(a) - txIds.indexOf(b))
    return sortedIds
  },
)

export const selectLastNTxIds = createDeepEqualOutputSelector(
  selectTxIdsByFilter,
  (_state: ReduxState, count: number) => count,
  (ids, count): TxId[] => ids.slice(0, count),
)

export const selectTxsByFilter = createDeepEqualOutputSelector(
  selectTxs,
  selectTxIdsByFilter,
  (txs, txIds) => txIds.map(txId => txs[txId]),
)

export const selectTxStatusById = createCachedSelector(
  selectTxById,
  (tx): Tx['status'] | undefined => tx?.status,
)((_state: ReduxState, txId: TxId) => txId ?? 'undefined')

export const selectRebaseIdsByFilter = createDeepEqualOutputSelector(
  selectRebaseIds,
  selectWalletRebasesByAccountIdAssetId,
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  (rebaseIds, data, accountIdFilter, assetIdFilter): RebaseId[] => {
    // filter by accountIdFilter, if it exists, otherwise data for all accountIds
    const filtered = pickBy(data, (_, accountId) =>
      accountIdFilter ? accountId === accountIdFilter : true,
    )
    const flattened = values(filtered)
      .flatMap(byAssetId => (assetIdFilter ? byAssetId?.[assetIdFilter] : values(byAssetId).flat()))
      .filter(isSome)
    const uniqueIds = uniq(flattened)
    const sortedIds = uniqueIds.sort((a, b) => rebaseIds.indexOf(a) - rebaseIds.indexOf(b))
    return sortedIds
  },
)

export const selectRebasesByFilter = createSelector(
  selectRebasesById,
  selectRebaseIdsByFilter,
  (rebasesById, rebaseIds): RebaseHistory[] =>
    rebaseIds.map(rebaseId => rebasesById[rebaseId]).filter(isSome),
)

/**
 * to be able to add an account for a chain, we want to ensure there is some tx history
 * on the current highest accountNumber accountIds
 *
 * note - there can be multiple accountIds sharing the same accountNumber - e.g. BTC legacy/segwit/segwit native
 * are all separate accounts that share the same account number
 */
export const selectMaybeNextAccountNumberByChainId = createSelector(
  selectWalletTxsByAccountIdAssetId,
  selectTxHistoryStatus,
  selectPortfolioAccountMetadata,
  selectChainIdParamFromFilter,
  (txIdsByAccountId, txHistoryStatus, accountMetadata, chainId): [boolean, number | null] => {
    // we can't know if an account has transacted until txHistory is loaded
    if (txHistoryStatus === 'loading') return [false, null]

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
)
