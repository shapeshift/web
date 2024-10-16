import { QueryStatus } from '@reduxjs/toolkit/dist/query'
import { ethChainId } from '@shapeshiftoss/caip'
import { createSelector } from 'reselect'
import type { ReduxState } from 'state/reducer'
import { selectFeeModelParamFromFilter } from 'state/selectors'
import { selectAccountIdsByChainId } from 'state/slices/portfolioSlice/selectors'

const selectSnapshotApiQueries = (state: ReduxState) => state.snapshotApi.queries

export const selectIsSnapshotApiQueriesPending = createSelector(selectSnapshotApiQueries, queries =>
  Object.values(queries).some(query => query?.status === QueryStatus.pending),
)
export const selectIsSnapshotApiQueriesRejected = createSelector(
  selectSnapshotApiQueries,
  queries =>
    Object.values(queries).some(query => query?.status === QueryStatus.rejected) &&
    !Object.values(queries).some(query => query?.status === QueryStatus.fulfilled),
)

export const selectVotingPowerByModel = (state: ReduxState) => state.snapshot.votingPowerByModel
export const selectVotingPower = createSelector(
  selectVotingPowerByModel,
  selectFeeModelParamFromFilter,
  selectAccountIdsByChainId,
  selectIsSnapshotApiQueriesRejected,
  (votingPowerByModel, feeModel, accountIdsbyChainId, isSnapshotApiQueriesRejected) => {
    if (isSnapshotApiQueriesRejected) return '0'

    const ethAccountIds = accountIdsbyChainId[ethChainId]
    if (!ethAccountIds?.length) return '0'
    console.log({ accountIdsbyChainId, votingPowerByModel })

    return votingPowerByModel[feeModel!]
  },
)

export const selectProposals = (state: ReduxState) => state.snapshot.proposals
export const selectActiveProposals = createSelector(selectProposals, proposals => {
  if (!proposals) return []

  return proposals.filter(proposal => proposal.state === 'active')
})
export const selectClosedProposals = createSelector(selectProposals, proposals => {
  if (!proposals) return []

  return proposals.filter(proposal => proposal.state === 'closed')
})
