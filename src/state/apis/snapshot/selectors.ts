import { QueryStatus } from '@reduxjs/toolkit/query'
import { ethChainId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import createCachedSelector from 're-reselect'
import type { Selector } from 'reselect'
import { createSelector } from 'reselect'

import { snapshot } from './snapshot'

import { calculateFeeUsd } from '@/lib/fees/model'
import type { ParameterModel } from '@/lib/fees/parameters/types'
import { isSome } from '@/lib/utils'
import type { ReduxState } from '@/state/reducer'
import { selectFeeModelParamFromFilter } from '@/state/selectors'
import { selectAccountIdsByChainId } from '@/state/slices/portfolioSlice/selectors'

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

export const selectVotingPower = createSelector(
  snapshot.selectors.selectVotingPowerByModel,
  selectFeeModelParamFromFilter,
  selectAccountIdsByChainId,
  selectIsSnapshotApiQueriesRejected,
  (votingPowerByModel, feeModel, accountIdsbyChainId, isSnapshotApiQueriesRejected) => {
    if (!feeModel) return '0'
    if (isSnapshotApiQueriesRejected) return '0'

    const ethAccountIds = accountIdsbyChainId[ethChainId]
    if (!ethAccountIds?.length) return '0'

    return votingPowerByModel[feeModel]
  },
)

export const selectThorchainLpVotingPower = createSelector(
  snapshot.selectors.selectVotingPowerByModel,
  votingPowerByModel => votingPowerByModel['THORCHAIN_LP'],
)

export const selectSwapperVotingPower = createSelector(
  snapshot.selectors.selectVotingPowerByModel,
  votingPowerByModel => votingPowerByModel['SWAPPER'],
)

type AffiliateFeesProps = {
  feeModel: ParameterModel
  inputAmountUsd: string | undefined
}

// TODO(gomes): this goes away, no need for this to be a selector
export const selectCalculatedFeeUsd: Selector<ReduxState, string> = createCachedSelector(
  (_state: ReduxState, { inputAmountUsd }: AffiliateFeesProps) => inputAmountUsd,
  inputAmountUsd => {
    const { feeUsd } = calculateFeeUsd({
      tradeAmountUsd: bnOrZero(inputAmountUsd),
    })

    return feeUsd.toFixed()
  },
)((_state, { feeModel, inputAmountUsd }) => `${feeModel}-${inputAmountUsd}`)

export const selectAppliedDiscountType = createCachedSelector(
  (_state: ReduxState, { inputAmountUsd }: AffiliateFeesProps) => inputAmountUsd,
  inputAmountUsd => {
    const { feeUsd } = calculateFeeUsd({
      tradeAmountUsd: bnOrZero(inputAmountUsd),
    })

    return feeUsd.toFixed()
  },
)((_state, { feeModel, inputAmountUsd }) => `${feeModel}-${inputAmountUsd}`)

export const selectIsVotingPowerLoading = createSelector(
  selectIsSnapshotApiQueriesPending,
  selectSwapperVotingPower,
  selectThorchainLpVotingPower,
  (isSnapshotApiQueriesPending, swapperVotingPower, thorchainLpVotingPower) => {
    return (
      isSnapshotApiQueriesPending && ![swapperVotingPower, thorchainLpVotingPower].every(isSome)
    )
  },
)
