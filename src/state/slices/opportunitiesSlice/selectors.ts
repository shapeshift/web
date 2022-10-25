import { createSelector } from '@reduxjs/toolkit'
import type { ReduxState } from 'state/reducer'
import { selectAccountIdParamFromFilter, selectUserStakingIdParamFromFilter } from 'state/selectors'

import type { LpId, StakingId, UserStakingId, UserStakingOpportunity } from './opportunitiesSlice'

// IDs selectors
export const selectLpIds = (state: ReduxState) => state.opportunities.lp.ids
export const selectStakingIds = (state: ReduxState) => state.opportunities.staking.ids
export const selectUserStakingIds = (state: ReduxState) => state.opportunities.userStaking.ids

export const selectLpOpportunitiesByAccountId = (state: ReduxState) =>
  state.opportunities.lp.byAccountId
export const selectStakingOpportunitiesByAccountId = (state: ReduxState) =>
  state.opportunities.staking.byAccountId
export const selectUserStakingOpportunitiesByStakingId = (state: ReduxState) =>
  state.opportunities.userStaking.byId

// "Give me all the LP opportunities this AccountId has", so I can get their metadata from the slice, and then their data from the portfolio slice
export const selectLpOpportunityIdsByAccountId = createSelector(
  selectLpOpportunitiesByAccountId,
  selectAccountIdParamFromFilter,
  (lpIdsByAccountId, accountId): LpId[] => lpIdsByAccountId[accountId] ?? [],
)

// "Give me all the staking opportunities this AccountId has", so I can get their metadata and their data from the slice
export const selectStakingOpportunityIdsByAccountId = createSelector(
  selectStakingOpportunitiesByAccountId,
  selectAccountIdParamFromFilter,
  (stakingIdsByAccountId, accountId): StakingId[] => stakingIdsByAccountId[accountId] ?? [],
)

// "Give me the staking value for this accountId on that specific opportunity"
export const selectUserStakingOpportunityByStakingId = createSelector(
  selectUserStakingOpportunitiesByStakingId,
  selectUserStakingIdParamFromFilter,
  (userStakingOpportunities, userStakingId: UserStakingId): UserStakingOpportunity | undefined =>
    userStakingOpportunities[userStakingId],
)
