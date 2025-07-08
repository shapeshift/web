import { QueryStatus } from '@reduxjs/toolkit/query'
import { ethChainId } from '@shapeshiftoss/caip'
import { createSelector } from 'reselect'

import { snapshot } from './snapshot'

import type { ReduxState } from '@/state/reducer'
import { selectAccountIdsByChainId } from '@/state/slices/portfolioSlice/selectors'

const selectSnapshotApiQueries = (state: ReduxState) => state.snapshotApi.queries

export const selectIsSnapshotApiQueriesPending = createSelector(selectSnapshotApiQueries, queries =>
  Object.values(queries).some(query => query?.status === QueryStatus.pending),
)
const selectIsSnapshotApiQueriesRejected = createSelector(
  selectSnapshotApiQueries,
  queries =>
    Object.values(queries).some(query => query?.status === QueryStatus.rejected) &&
    !Object.values(queries).some(query => query?.status === QueryStatus.fulfilled),
)

export const selectVotingPowerOrZero = createSelector(
  snapshot.selectors.selectVotingPower,
  selectAccountIdsByChainId,
  selectIsSnapshotApiQueriesRejected,
  (votingPower, accountIdsbyChainId, isSnapshotApiQueriesRejected) => {
    if (isSnapshotApiQueriesRejected) return '0'

    const ethAccountIds = accountIdsbyChainId[ethChainId]
    if (!ethAccountIds?.length) return '0'

    return votingPower
  },
)
