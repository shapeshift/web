import { CAIP19 } from '@shapeshiftoss/caip'
import intersection from 'lodash/intersection'
import isEqual from 'lodash/isEqual'
import last from 'lodash/last'
import values from 'lodash/values'
import { createSelector } from 'reselect'
import { ReduxState } from 'state/reducer'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'

import { Tx, TxId, TxIdByAssetId } from './txHistorySlice'

export const selectTxValues = (state: ReduxState) => values(state.txHistory.byId)
export const selectTxs = (state: ReduxState) => state.txHistory.byId
export const selectTxIds = (state: ReduxState) => state.txHistory.ids

export const selectTxIdsByAccountId = (state: ReduxState) => state.txHistory.byAccountId

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
  { memoizeOptions: { resultEqualityCheck: isEqual } }
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
  { memoizeOptions: { resultEqualityCheck: isEqual } }
)

export const selectTxById = createSelector(
  (state: ReduxState) => state.txHistory.byId,
  (_state: ReduxState, txId: string) => txId,
  (txsById, txId) => txsById[txId]
)

export const selectTxDateByIds = createSelector(selectTxIdsParam, selectTxs, (txIds: TxId[], txs) =>
  txIds.map((txId: TxId) => ({ txId, date: txs[txId].blockTime }))
)

export const selectTxsByAssetId = (state: ReduxState) => state.txHistory.byAssetId

const selectAssetIdParam = (_state: ReduxState, assetId: CAIP19) => assetId

const selectTxIdsByAssetId = createSelector(
  selectTxsByAssetId,
  selectAssetIdParam,
  (txsByAssetId: TxIdByAssetId, assetId): string[] => txsByAssetId[assetId] ?? []
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
  { memoizeOptions: { resultEqualityCheck: isEqual } }
)

export const selectTxsByFilter = createSelector(selectTxs, selectTxIdsByFilter, (txs, txIds) =>
  txIds.map(txId => txs[txId])
)

// this is only used on trade confirm - new txs will be pushed
// to the end of this array, so last is guaranteed to be latest
// this can return undefined as we may be trading into this asset
// for the first time
export const selectLastTxStatusByAssetId = createSelector(
  selectTxIdsByAssetId,
  selectTxs,
  (txIdsByAssetId, txs): Tx['status'] | undefined => txs[last(txIdsByAssetId) ?? '']?.status
)
