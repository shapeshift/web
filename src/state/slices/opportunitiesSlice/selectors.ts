import { createSelector } from '@reduxjs/toolkit'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import {
  selectAccountIdParamFromFilter,
  selectStakingIdParamFromFilter,
  selectUserStakingIdParamFromFilter,
} from 'state/selectors'

import type {
  LpId,
  OpportunityMetadata,
  StakingId,
  UserStakingId,
  UserStakingOpportunity,
} from './opportunitiesSlice'
import { deserializeUserStakingId, filterUserStakingIdByStakingId } from './utils'

// IDs selectors
export const selectLpIds = (state: ReduxState) => state.opportunities.lp.ids
export const selectStakingIds = (state: ReduxState) => state.opportunities.staking.ids
export const selectUserStakingIds = (state: ReduxState) => state.opportunities.userStaking.ids

export const selectLpOpportunitiesByAccountId = (state: ReduxState) =>
  state.opportunities.lp.byAccountId
export const selectStakingOpportunitiesByAccountId = (state: ReduxState) =>
  state.opportunities.staking.byAccountId
export const selectUserStakingOpportunitiesById = (state: ReduxState) =>
  state.opportunities.userStaking.byId
export const selectStakingOpportunitiesById = (state: ReduxState) =>
  state.opportunities.staking.byId

// "Give me all the LP opportunities this AccountId has", so I can get their metadata from the slice, and then their data from the portfolio slice
export const selectLpOpportunityIdsByAccountId = createDeepEqualOutputSelector(
  selectLpOpportunitiesByAccountId,
  selectAccountIdParamFromFilter,
  (lpIdsByAccountId, accountId): LpId[] => lpIdsByAccountId[accountId] ?? [],
)

// "Give me all the staking opportunities this AccountId has", so I can get their metadata and their data from the slice
export const selectStakingOpportunityIdsByAccountId = createDeepEqualOutputSelector(
  selectStakingOpportunitiesByAccountId,
  selectAccountIdParamFromFilter,
  (stakingIdsByAccountId, accountId): StakingId[] => stakingIdsByAccountId[accountId] ?? [],
)

// I'm a selector which doesn't actually selects state, don't prepend me with `select`
export const deserializeStakingIdFromUserStakingId = createSelector(
  selectUserStakingIdParamFromFilter,
  (userStakingId): StakingId => {
    if (userStakingId === '') return '*' // Narrowing flavoured template litteral type

    const parts = deserializeUserStakingId(userStakingId)
    const [, stakingId] = parts
    return stakingId
  },
)

// "How much this specific account has staked on that opportunity"
export const selectUserStakingOpportunityByUserStakingId = createDeepEqualOutputSelector(
  selectUserStakingOpportunitiesById,
  selectUserStakingIdParamFromFilter,
  deserializeStakingIdFromUserStakingId,
  selectStakingOpportunitiesById,
  (
    userStakingOpportunities,
    userStakingId,
    stakingId,
    stakingOpportunities,
  ): (UserStakingOpportunity & OpportunityMetadata) | undefined => {
    if (userStakingId === '') return // Narrowing flavoured template litteral type

    const userOpportunity = userStakingOpportunities[userStakingId]
    const opportunityMetadata = stakingOpportunities[stakingId]

    return {
      ...userOpportunity,
      ...opportunityMetadata,
    }
  },
)

// "Give me the staking values of all my acccounts for that specific opportunity"
export const selectUserStakingOpportunitiesByStakingId = createDeepEqualOutputSelector(
  selectUserStakingOpportunitiesById,
  selectStakingIdParamFromFilter,
  selectUserStakingIds,
  selectStakingOpportunitiesById,
  (
    userStakingOpportunities,
    stakingId,
    userStakingOpportunityIds,
    stakingOpportunities,
  ): (UserStakingOpportunity & OpportunityMetadata & { userStakingId: UserStakingId })[] => {
    // Filter out only the user data for this specific opportunity
    const filteredUserStakingOpportunityIds = userStakingOpportunityIds.filter(userStakingId =>
      filterUserStakingIdByStakingId(userStakingId, stakingId),
    )

    if (!userStakingOpportunityIds.length) return []

    return filteredUserStakingOpportunityIds.map(userStakingId => ({
      ...userStakingOpportunities[userStakingId],
      ...stakingOpportunities[stakingId],
      userStakingId,
    }))
  },
)

// "Give me the total values over all my accounts aggregated into one for that specific opportunity"
export const selectAggregatedUserStakingOpportunityByStakingId = createDeepEqualOutputSelector(
  selectUserStakingOpportunitiesByStakingId,
  (userStakingOpportunities): UserStakingOpportunity => {
    return userStakingOpportunities.reduce((acc, userStakingOpportunity) => {
      const { userStakingId, ...userStakingOpportunityWithoutUserStakingId } =
        userStakingOpportunity // It makes sense to have it when we have a collection, but becomes useless when aggregated
      acc = {
        ...userStakingOpportunityWithoutUserStakingId,
        stakedAmountCryptoPrecision: bnOrZero(acc.stakedAmountCryptoPrecision)
          .plus(userStakingOpportunity.stakedAmountCryptoPrecision)
          .toString(),
        rewardsAmountCryptoPrecision: bnOrZero(acc.rewardsAmountCryptoPrecision)
          .plus(userStakingOpportunity.rewardsAmountCryptoPrecision)
          .toString(),
      }

      return acc
    }, {} as UserStakingOpportunity)
  },
)

// Useful when multiple accounts are staked on the same opportunity, so we can detect the highest UserStakingId one
export const selectHighestBalanceLpUserStakingIdByStakingId = createSelector(
  selectUserStakingOpportunitiesById,
  selectStakingIdParamFromFilter,
  (userStakingOpportunities, stakingId) => {
    if (stakingId === '') return '*' // Narrowing flavoured type

    const userStakingOpportunitiesEntries = Object.entries(userStakingOpportunities) as [
      UserStakingId,
      UserStakingOpportunity,
    ][]
    return userStakingOpportunitiesEntries
      .filter(([userStakingId]) => filterUserStakingIdByStakingId(userStakingId, stakingId))
      .sort(([, userStakingOpportunityA], [, userStakingOpportunityB]) =>
        bnOrZero(userStakingOpportunityB.stakedAmountCryptoPrecision)
          .minus(userStakingOpportunityA.stakedAmountCryptoPrecision)
          .toNumber(),
      )[0]
  },
)
