import { createSelector } from '@reduxjs/toolkit'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import {
  selectAccountIdParamFromFilter,
  selectLpIdParamFromFilter,
  selectStakingIdParamFromFilter,
  selectUserStakingIdParamFromFilter,
} from 'state/selectors'

import type { PortfolioAccountBalances } from '../portfolioSlice/portfolioSliceCommon'
import { selectAssets, selectPortfolioCryptoHumanBalanceByAssetId } from '../selectors'
import { LP_EARN_OPPORTUNITIES, STAKING_EARN_OPPORTUNITIES } from './constants'
import type {
  LpId,
  OpportunityMetadata,
  StakingId,
  UserStakingId,
  UserStakingOpportunity,
} from './types'
import { deserializeUserStakingId, filterUserStakingIdByStakingIdCompareFn } from './utils'

// Redeclared because of circular deps, don't export me
const selectPortfolioAccountBalances = createDeepEqualOutputSelector(
  (state: ReduxState): PortfolioAccountBalances['byId'] => state.portfolio.accountBalances.byId,
  accountBalances => accountBalances,
)

// IDs selectors
export const selectLpIds = (state: ReduxState) => state.opportunities.lp.ids
export const selectStakingIds = (state: ReduxState) => state.opportunities.staking.ids
export const selectUserStakingIds = (state: ReduxState) => state.opportunities.userStaking.ids

export const selectLpOpportunitiesByAccountId = (state: ReduxState) =>
  state.opportunities.lp.byAccountId
export const selectLpOpportunitiesById = (state: ReduxState) => state.opportunities.lp.byId
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

export const selectDeserializedStakingIdFromUserStakingIdParam = createSelector(
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
  selectDeserializedStakingIdFromUserStakingIdParam,
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
      filterUserStakingIdByStakingIdCompareFn(userStakingId, stakingId),
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
  (userStakingOpportunities): UserStakingOpportunity & OpportunityMetadata => {
    const initial = {} as UserStakingOpportunity & OpportunityMetadata

    return userStakingOpportunities.reduce<UserStakingOpportunity & OpportunityMetadata>(
      (acc, userStakingOpportunity) => {
        const { userStakingId, ...userStakingOpportunityWithoutUserStakingId } =
          userStakingOpportunity // It makes sense to have it when we have a collection, but becomes useless when aggregated

        return {
          ...userStakingOpportunityWithoutUserStakingId,
          stakedAmountCryptoPrecision: bnOrZero(acc.stakedAmountCryptoPrecision)
            .plus(userStakingOpportunity.stakedAmountCryptoPrecision)
            .toString(),
          rewardsAmountCryptoPrecision: bnOrZero(acc.rewardsAmountCryptoPrecision)
            .plus(userStakingOpportunity.rewardsAmountCryptoPrecision)
            .toString(),
        }
      },
      initial,
    )
  },
)

// "Give me the total values over all my accounts aggregated into one for each opportunity"
// TODO: testme
export const selectAggregatedUserStakingOpportunities = createDeepEqualOutputSelector(
  selectStakingIds,
  (state: ReduxState) => state,
  (stakingIds, state): (UserStakingOpportunity & OpportunityMetadata)[] =>
    stakingIds.map(stakingId =>
      selectAggregatedUserStakingOpportunityByStakingId(state, { stakingId }),
    ),
)

// The same as the previous selector, but parsed as an EarnOpportunityType
// TODO: testme
export const selectAggregatedEarnUserStakingOpportunities = createDeepEqualOutputSelector(
  selectAggregatedUserStakingOpportunities,
  aggregatedUserStakingOpportunities =>
    aggregatedUserStakingOpportunities.map(opportunity => ({
      ...opportunity,
      ...STAKING_EARN_OPPORTUNITIES[opportunity.underlyingAssetId],
      chainId: fromAssetId(opportunity.underlyingAssetId).chainId,
      cryptoAmount: opportunity.stakedAmountCryptoPrecision,
      isLoaded: true,
    })),
)

// The same as the previous selector, but parsed as an EarnOpportunityType
// TODO: testme
export const selectAggregatedEarnUserLpOpportunity = createDeepEqualOutputSelector(
  selectLpOpportunitiesById,
  selectLpIdParamFromFilter,
  selectPortfolioCryptoHumanBalanceByAssetId,
  selectAssets,
  (lpOpportunitiesById, lpId, aggregatedLpAssetBalance, assets) => {
    const opportunityMetadata = lpOpportunitiesById[lpId]
    const baseLpEarnOpportunity = LP_EARN_OPPORTUNITIES[lpId]

    const [underlyingEthAmount, underlyingFoxAmount] = opportunityMetadata?.underlyingAssetIds.map(
      (assetId, i) =>
        bnOrZero(aggregatedLpAssetBalance)
          .times(
            fromBaseUnit(
              opportunityMetadata?.underlyingAssetRatios[i] ?? '0',
              assets[assetId].precision,
            ),
          )
          .toFixed(6)
          .toString(),
    ) ?? ['0', '0']

    const opportunity = {
      ...baseLpEarnOpportunity,
      ...opportunityMetadata,
      isLoaded: true,
      // TODO; All of these should be derived in one place, this is wrong, just an intermediary step to make tsc happy
      chainId: fromAssetId(lpId).chainId,
      underlyingFoxAmount,
      underlyingEthAmount,
      cryptoAmount: aggregatedLpAssetBalance,
      // TODO: this all goes away anyway
      fiatAmount: '42',
    }

    return opportunity
  },
)

// "Give me the total values over all my accounts aggregated into one for each opportunity, and then aggregated these into one final value"
// TODO: testme
export const selectAggregatedUserStakingOpportunity = createDeepEqualOutputSelector(
  selectAggregatedUserStakingOpportunities,
  (aggregatedOpportunities): UserStakingOpportunity & OpportunityMetadata =>
    aggregatedOpportunities.reduce<UserStakingOpportunity & OpportunityMetadata>(
      (acc, currentOpportunity) => {
        return {
          ...acc,
          ...currentOpportunity,
          stakedAmountCryptoPrecision: bnOrZero(currentOpportunity.stakedAmountCryptoPrecision)
            .plus(acc.stakedAmountCryptoPrecision)
            .toString(),
          rewardsAmountCryptoPrecision: bnOrZero(currentOpportunity.rewardsAmountCryptoPrecision)
            .plus(acc.rewardsAmountCryptoPrecision)
            .toString(),
        }
      },
      {} as UserStakingOpportunity & OpportunityMetadata,
    ),
)

// Useful when multiple accounts are staked on the same opportunity, so we can detect the highest staked balance one
export const selectHighestBalanceAccountIdByStakingId = createSelector(
  selectUserStakingOpportunitiesById,
  selectStakingIdParamFromFilter,
  (userStakingOpportunities, stakingId): AccountId | null => {
    if (stakingId === '') return '*' // Narrowing flavoured type

    const userStakingOpportunitiesEntries = Object.entries(userStakingOpportunities) as [
      UserStakingId,
      UserStakingOpportunity,
    ][]
    const foundEntry = (userStakingOpportunitiesEntries ?? [])
      .filter(([userStakingId]) =>
        filterUserStakingIdByStakingIdCompareFn(userStakingId, stakingId),
      )
      .sort(([, userStakingOpportunityA], [, userStakingOpportunityB]) =>
        bnOrZero(userStakingOpportunityB.stakedAmountCryptoPrecision)
          .minus(userStakingOpportunityA.stakedAmountCryptoPrecision)
          .toNumber(),
      )?.[0]

    const foundUserStakingId = foundEntry?.[0]

    if (!foundUserStakingId) return null

    const [foundAccountId] = deserializeUserStakingId(foundUserStakingId)

    return foundAccountId
  },
)

// Useful when multiple accounts are staked on the same opportunity, so we can detect the highest staked balance one
export const selectHighestBalanceAccountIdByLpId = createSelector(
  selectPortfolioAccountBalances,
  selectLpIdParamFromFilter,
  (portfolioAccountBalances, lpId): AccountId | undefined => {
    if (lpId === '') return '*' // Narrowing flavoured type

    const foundEntries = Object.entries(portfolioAccountBalances)
      .filter(([, byAccountId]) => byAccountId.hasOwnProperty(lpId))
      .sort(([, a], [, b]) =>
        // In the case of EVM chain LPing, the LpId actually is an AssetId
        // Note that this may not hold true for the concept of "LPing" on other chains, hence the type assertion
        // In case we get an LpId that's not an AssetId, we'll have to implement custom logic for it
        // This is NOT a full LP abstraction, and for all intents and purposes is assuming the LP as token i.e an AssetId in portfolio, not an IOU
        bn(b[lpId as AssetId])
          .minus(a[lpId as AssetId])
          .toNumber(),
      )[0]

    // Chainable methods that produce an iterable screw the narrowed type back to string
    const foundAccountId: AccountId = foundEntries?.[0]

    return foundAccountId
  },
)
