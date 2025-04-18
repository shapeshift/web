import { QueryStatus } from '@reduxjs/toolkit/query'
import { ethChainId, foxWifHatAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import createCachedSelector from 're-reselect'
import type { Selector } from 'reselect'
import { createSelector } from 'reselect'

import { snapshot } from './snapshot'

import type { CalculateFeeBpsReturn } from '@/lib/fees/model'
import { calculateFees } from '@/lib/fees/model'
import type { ParameterModel } from '@/lib/fees/parameters/types'
import { isSome } from '@/lib/utils'
import type { ReduxState } from '@/state/reducer'
import { selectFeeModelParamFromFilter } from '@/state/selectors'
import { selectPortfolioAssetBalancesBaseUnit } from '@/state/slices/common-selectors'
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

export const selectCalculatedFees: Selector<ReduxState, CalculateFeeBpsReturn> =
  createCachedSelector(
    (_state: ReduxState, { feeModel }: AffiliateFeesProps) => feeModel,
    (_state: ReduxState, { inputAmountUsd }: AffiliateFeesProps) => inputAmountUsd,
    selectVotingPower,
    selectIsSnapshotApiQueriesRejected,
    selectPortfolioAssetBalancesBaseUnit,
    (feeModel, inputAmountUsd, votingPower, isSnapshotApiQueriesRejected, assetBalances) => {
      const foxWifHatHeld = assetBalances[foxWifHatAssetId]

      const fees: CalculateFeeBpsReturn = calculateFees({
        tradeAmountUsd: bnOrZero(inputAmountUsd),
        foxHeld: bnOrZero(votingPower),
        foxWifHatHeldCryptoBaseUnit: bnOrZero(foxWifHatHeld),
        feeModel,
        isSnapshotApiQueriesRejected,
      })

      return fees
    },
  )((_state, { feeModel, inputAmountUsd }) => `${feeModel}-${inputAmountUsd}`)

export const selectAppliedDiscountType = createCachedSelector(
  (_state: ReduxState, { feeModel }: AffiliateFeesProps) => feeModel,
  (_state: ReduxState, { inputAmountUsd }: AffiliateFeesProps) => inputAmountUsd,
  selectVotingPower,
  selectIsSnapshotApiQueriesRejected,
  selectPortfolioAssetBalancesBaseUnit,
  (feeModel, inputAmountUsd, votingPower, isSnapshotApiQueriesRejected, assetBalances) => {
    const foxWifHatHeld = assetBalances[foxWifHatAssetId]

    const fees = calculateFees({
      tradeAmountUsd: bnOrZero(inputAmountUsd),
      foxHeld: bnOrZero(votingPower),
      foxWifHatHeldCryptoBaseUnit: bnOrZero(foxWifHatHeld),
      feeModel,
      isSnapshotApiQueriesRejected,
    })

    return fees.appliedDiscountType
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
