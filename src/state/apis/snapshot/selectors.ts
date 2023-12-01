import { QueryStatus } from '@reduxjs/toolkit/dist/query'
import { createSelector } from 'reselect'
import type { ReduxState } from 'state/reducer'

const selectSnapshotApiQueries = (state: ReduxState) => state.snapshotApi.queries

export const selectIsSnapshotApiQueriesPending = createSelector(selectSnapshotApiQueries, queries =>
  Object.values(queries).some(query => query?.status === QueryStatus.pending),
)
