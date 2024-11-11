import { QueryStatus } from '@reduxjs/toolkit/dist/query'
import { ethChainId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import createCachedSelector from 're-reselect'
import type { Selector } from 'reselect'
import { createSelector } from 'reselect'
import type { CalculateFeeBpsReturn } from 'lib/fees/model'
import { calculateFees } from 'lib/fees/model'
import type { ParameterModel } from 'lib/fees/parameters/types'
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

    return votingPowerByModel[feeModel!]
  },
)
export const selectThorVotingPower = (state: ReduxState) =>
  state.snapshot.votingPowerByModel['THORSWAP']

export const selectProposals = (state: ReduxState) => state.snapshot.proposals

type AffiliateFeesProps = {
  feeModel: ParameterModel
  inputAmountUsd: string | undefined
}

export const selectCalculatedFees: Selector<ReduxState, CalculateFeeBpsReturn> =
  createCachedSelector(
    (_state: ReduxState, { feeModel }: AffiliateFeesProps) => feeModel,
    (_state: ReduxState, { inputAmountUsd }: AffiliateFeesProps) => inputAmountUsd,
    selectVotingPower,
    selectThorVotingPower,
    selectIsSnapshotApiQueriesRejected,
    (feeModel, inputAmountUsd, votingPower, thorVotingPower, isSnapshotApiQueriesRejected) => {
      const fees: CalculateFeeBpsReturn = calculateFees({
        tradeAmountUsd: bnOrZero(inputAmountUsd),
        foxHeld: bnOrZero(votingPower),
        thorHeld: bnOrZero(thorVotingPower),
        feeModel,
        isSnapshotApiQueriesRejected,
      })

      return fees
    },
  )((_state, { feeModel, inputAmountUsd }) => `${feeModel}-${inputAmountUsd}`)
