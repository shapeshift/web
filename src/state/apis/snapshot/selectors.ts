import { QueryStatus } from '@reduxjs/toolkit/dist/query'
import { createSelector } from 'reselect'
import type { ReduxState } from 'state/reducer'
import { selectFeeModelParamFromFilter } from 'state/selectors'

const selectSnapshotApiQueries = (state: ReduxState) => state.snapshotApi.queries

export const selectIsSnapshotApiQueriesPending = createSelector(selectSnapshotApiQueries, queries =>
  Object.values(queries).some(query => query?.status === QueryStatus.pending),
)

export const selectVotingPowerByModel = (state: ReduxState) => state.snapshot.votingPowerByModel
export const selectVotingPower = createSelector(
  selectVotingPowerByModel,
  selectFeeModelParamFromFilter,
  (votingPowerByModel, feeModel) => votingPowerByModel[feeModel!],
)
