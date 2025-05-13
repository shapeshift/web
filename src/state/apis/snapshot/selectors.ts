import { QueryStatus } from '@reduxjs/toolkit/query'
import { ethChainId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import createCachedSelector from 're-reselect'
import type { Selector } from 'reselect'
import { createSelector } from 'reselect'

import { snapshot } from './snapshot'

import { calculateFeeUsd } from '@/lib/fees/model'
import type { ParameterModel } from '@/lib/fees/parameters/types'
import type { ReduxState } from '@/state/reducer'
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

type AffiliateFeesProps = {
  feeModel: ParameterModel
  inputAmountUsd: string | undefined
}

export const selectCalculatedFeeUsd: Selector<ReduxState, string> = createCachedSelector(
  (_state: ReduxState, { inputAmountUsd }: AffiliateFeesProps) => inputAmountUsd,
  inputAmountUsd => {
    const { feeUsd } = calculateFeeUsd({
      inputAmountUsd: bnOrZero(inputAmountUsd),
    })

    return feeUsd.toFixed()
  },
)((_state, { feeModel, inputAmountUsd }) => `${feeModel}-${inputAmountUsd}`)
