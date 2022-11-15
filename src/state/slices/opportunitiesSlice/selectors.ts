import { createSelector } from '@reduxjs/toolkit'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { AssetWithBalance } from 'features/defi/components/Overview/Overview'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import pickBy from 'lodash/pickBy'
import { createCachedSelector } from 're-reselect'
import type { FoxFarmingEarnOpportunityType } from 'context/FoxEthProvider/FoxEthProvider'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { isSome } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import {
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  selectLpIdParamFromFilter,
  selectStakingIdParamFromFilter,
  selectUserStakingIdParamFromFilter,
} from 'state/selectors'

import { selectAssets } from '../assetsSlice/selectors'
import { selectMarketData } from '../marketDataSlice/selectors'
import type { PortfolioAccountBalancesById } from '../portfolioSlice/portfolioSliceCommon'
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
  (state: ReduxState) => state.portfolio.accountMetadata.ids,
  (state: ReduxState): PortfolioAccountBalancesById => state.portfolio.accountBalances.byId,
  (walletAccountIds, accountBalancesById) =>
    pickBy(accountBalancesById, (_balances, accountId: AccountId) =>
      walletAccountIds.includes(accountId),
    ),
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

export const selectLpAccountIds = createDeepEqualOutputSelector(
  selectLpOpportunitiesByAccountId,
  (byAccountId): AccountId[] => Object.keys(byAccountId),
)

export const selectStakingAccountIds = createDeepEqualOutputSelector(
  selectStakingOpportunitiesByAccountId,
  (byAccountId): AccountId[] => Object.keys(byAccountId),
)

// "Give me all the LP opportunities this AccountId has", so I can get their metadata from the slice, and then their data from the portfolio slice
export const selectLpOpportunityIdsByAccountId = createDeepEqualOutputSelector(
  selectLpOpportunitiesByAccountId,
  selectAccountIdParamFromFilter,
  (lpIdsByAccountId, accountId): LpId[] => {
    if (!accountId) return []

    return lpIdsByAccountId[accountId] ?? []
  },
)

// "Give me all the staking opportunities this AccountId has", so I can get their metadata and their data from the slice
export const selectStakingOpportunityIdsByAccountId = createDeepEqualOutputSelector(
  selectStakingOpportunitiesByAccountId,
  selectAccountIdParamFromFilter,
  (stakingIdsByAccountId, accountId): StakingId[] => {
    if (!accountId) return []

    return stakingIdsByAccountId[accountId] ?? []
  },
)

export const selectDeserializedStakingIdFromUserStakingIdParam = createSelector(
  selectUserStakingIdParamFromFilter,
  (userStakingId): StakingId => {
    if (!userStakingId) return '*' // Narrowing flavoured template litteral type

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
    if (!userStakingId) return // Narrowing flavoured template litteral type

    const userOpportunity = userStakingOpportunities[userStakingId]
    const opportunityMetadata = stakingOpportunities[stakingId]

    if (!(opportunityMetadata && userOpportunity)) return

    return {
      ...userOpportunity,
      ...opportunityMetadata,
    }
  },
)

// "Give me the staking values of all my accounts for that specific opportunity"
export const selectUserStakingOpportunitiesByStakingId = createDeepEqualOutputSelector(
  selectUserStakingOpportunitiesById,
  selectUserStakingIds,
  selectStakingOpportunitiesById,
  selectStakingIds,
  (
    userStakingOpportunities,
    userStakingOpportunityIds,
    stakingOpportunities,
    stakingIds,
  ): Record<
    StakingId,
    (OpportunityMetadata & UserStakingOpportunity & { userStakingId: `${string}*${string}` })[]
  > =>
    stakingIds.reduce<
      Record<
        StakingId,
        (OpportunityMetadata & UserStakingOpportunity & { userStakingId: `${string}*${string}` })[]
      >
    >((acc, stakingId) => {
      if (!stakingId) return acc
      // Filter out only the user data for this specific opportunity
      const filteredUserStakingOpportunityIds = userStakingOpportunityIds.filter(userStakingId =>
        filterUserStakingIdByStakingIdCompareFn(userStakingId, stakingId),
      )

      if (!userStakingOpportunityIds.length) {
        acc[stakingId] = []
        return acc
      }

      acc[stakingId] = filteredUserStakingOpportunityIds
        .map(userStakingId => {
          const opportunityData = userStakingOpportunities[userStakingId]
          const opportunityMetadata = stakingOpportunities[stakingId]
          if (!opportunityData || !opportunityMetadata) return undefined
          return Object.assign({}, opportunityMetadata, opportunityData, { userStakingId })
        })
        .filter(isSome)

      return acc
    }, {}),
)

// "Give me the staking values of all my accounts for that specific opportunity"
export const selectUserStakingOpportunitiesFromStakingId = createDeepEqualOutputSelector(
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
    if (!stakingId) return []
    // Filter out only the user data for this specific opportunity
    const filteredUserStakingOpportunityIds = userStakingOpportunityIds.filter(userStakingId =>
      filterUserStakingIdByStakingIdCompareFn(userStakingId, stakingId),
    )

    if (!userStakingOpportunityIds.length) return []

    return filteredUserStakingOpportunityIds
      .map(userStakingId => {
        const opportunityData = userStakingOpportunities[userStakingId]
        const opportunityMetadata = stakingOpportunities[stakingId]
        if (!opportunityData || !opportunityMetadata) return undefined
        return Object.assign({}, opportunityMetadata, opportunityData, { userStakingId })
      })
      .filter(isSome)
  },
)

const getAggregatedUserStakingOpportunityByStakingId = (
  userStakingOpportunities: (UserStakingOpportunity &
    OpportunityMetadata & { userStakingId: UserStakingId })[],
): (UserStakingOpportunity & OpportunityMetadata) | undefined => {
  if (!userStakingOpportunities?.length) return

  return userStakingOpportunities.reduce<
    (UserStakingOpportunity & OpportunityMetadata) | undefined
  >((acc, userStakingOpportunity) => {
    const { userStakingId, ...userStakingOpportunityWithoutUserStakingId } = userStakingOpportunity // It makes sense to have it when we have a collection, but becomes useless when aggregated

    return {
      ...userStakingOpportunityWithoutUserStakingId,
      stakedAmountCryptoPrecision: bnOrZero(acc?.stakedAmountCryptoPrecision)
        .plus(userStakingOpportunity.stakedAmountCryptoPrecision)
        .toString(),
      rewardsAmountCryptoPrecision: bnOrZero(acc?.rewardsAmountCryptoPrecision)
        .plus(userStakingOpportunity.rewardsAmountCryptoPrecision)
        .toString(),
    }
  }, undefined)
}

// "Give me the total values over all my accounts aggregated into one for that specific opportunity"
export const selectAggregatedUserStakingOpportunityByStakingId = createDeepEqualOutputSelector(
  selectUserStakingOpportunitiesByStakingId,
  selectStakingIdParamFromFilter,
  (
    userStakingOpportunitiesById,
    stakingId,
  ): (UserStakingOpportunity & OpportunityMetadata) | undefined => {
    if (!stakingId) return

    const userStakingOpportunities = userStakingOpportunitiesById[stakingId]

    return getAggregatedUserStakingOpportunityByStakingId(userStakingOpportunities)
  },
)

export const selectAggregatedEarnUserStakingOpportunityByStakingId = createDeepEqualOutputSelector(
  selectAggregatedUserStakingOpportunityByStakingId,
  selectMarketData,
  selectAssets,
  (opportunity, marketData, assets): FoxFarmingEarnOpportunityType | undefined =>
    opportunity &&
    Object.assign({}, STAKING_EARN_OPPORTUNITIES[opportunity.assetId], opportunity, {
      chainId: fromAssetId(opportunity.assetId).chainId,
      cryptoAmount: opportunity.stakedAmountCryptoPrecision,
      fiatAmount: bnOrZero(opportunity.stakedAmountCryptoPrecision)
        .times(marketData[opportunity.underlyingAssetId as AssetId]?.price ?? '0')
        .toString(),
      provider: DefiProvider.FoxFarming,
      isLoaded: true,
      icons: opportunity.underlyingAssetIds.map(assetId => assets[assetId].icon),
      opportunityName: opportunity.name,
    }),
)

// "Give me the total values over all my accounts aggregated into one for each opportunity"
// TODO: testme
export const selectAggregatedUserStakingOpportunities = createDeepEqualOutputSelector(
  selectUserStakingOpportunitiesByStakingId,
  (userStakingOpportunitiesByStakingId): (UserStakingOpportunity & OpportunityMetadata)[] =>
    Object.values(userStakingOpportunitiesByStakingId)
      .filter(isSome)
      .map(getAggregatedUserStakingOpportunityByStakingId)
      .filter(isSome),
)

// The same as selectAggregatedUserStakingOpportunities, but parsed as an EarnOpportunityType
// TODO: testme
export const selectAggregatedEarnUserStakingOpportunities = createDeepEqualOutputSelector(
  selectAggregatedUserStakingOpportunities,
  selectMarketData,
  selectAssets,
  (aggregatedUserStakingOpportunities, marketData, assets): FoxFarmingEarnOpportunityType[] =>
    aggregatedUserStakingOpportunities.map(opportunity => ({
      ...STAKING_EARN_OPPORTUNITIES[opportunity.assetId],
      ...opportunity,
      chainId: fromAssetId(opportunity.assetId).chainId,
      cryptoAmount: opportunity.stakedAmountCryptoPrecision,
      fiatAmount: bnOrZero(opportunity.stakedAmountCryptoPrecision)
        .times(marketData[opportunity.underlyingAssetId as AssetId]?.price ?? '0')
        .toString(),
      provider: DefiProvider.FoxFarming,
      isLoaded: true,
      icons: opportunity.underlyingAssetIds.map(assetId => assets[assetId].icon),
      opportunityName: opportunity.name,
    })),
)

// All opportunities, across all accounts, aggregated into one
// TODO: testme
export const selectAggregatedEarnUserStakingOpportunity = createDeepEqualOutputSelector(
  selectAggregatedEarnUserStakingOpportunities,
  (earnOpportunities): FoxFarmingEarnOpportunityType | undefined =>
    earnOpportunities.reduce<FoxFarmingEarnOpportunityType | undefined>(
      (acc, currentOpportunity) => {
        return Object.assign({}, acc, currentOpportunity, {
          cryptoAmount: bnOrZero(currentOpportunity.stakedAmountCryptoPrecision)
            .plus(acc?.stakedAmountCryptoPrecision ?? 0)
            .toString(),
          fiatAmount: bnOrZero(currentOpportunity.rewardsAmountCryptoPrecision)
            .plus(acc?.rewardsAmountCryptoPrecision ?? 0)
            .toString(),
          stakedAmountCryptoPrecision: bnOrZero(currentOpportunity.stakedAmountCryptoPrecision)
            .plus(acc?.stakedAmountCryptoPrecision ?? 0)
            .toString(),
          rewardsAmountCryptoPrecision: bnOrZero(currentOpportunity.rewardsAmountCryptoPrecision)
            .plus(acc?.rewardsAmountCryptoPrecision ?? 0)
            .toString(),
        })
      },
      undefined,
    ),
)

const selectPortfolioAssetBalances = createDeepEqualOutputSelector(
  selectPortfolioAccountBalances,
  (accountBalancesById): Record<AssetId, string> =>
    Object.values(accountBalancesById).reduce<Record<AssetId, string>>((acc, byAccountId) => {
      Object.entries(byAccountId).forEach(
        ([assetId, balance]) =>
          (acc[assetId] = bnOrZero(acc[assetId]).plus(bnOrZero(balance).toString()).toString()),
      )
      return acc
    }, {}),
)

const selectPortfolioCryptoHumanBalanceByFilter = createCachedSelector(
  selectAssets,
  selectPortfolioAccountBalances,
  selectPortfolioAssetBalances,
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  (assets, accountBalances, assetBalances, accountId, assetId): string | undefined => {
    if (!assetId) return
    const precision = assets?.[assetId]?.precision ?? 0
    if (accountId) return fromBaseUnit(bnOrZero(accountBalances?.[accountId]?.[assetId]), precision)
    return fromBaseUnit(bnOrZero(assetBalances[assetId]), precision)
  },
)((_s: ReduxState, filter) => `${filter?.accountId}-${filter?.assetId}` ?? 'accountId-assetId')

// A user LpOpportunity, parsed as an EarnOpportunityType
// TODO: testme
export const selectEarnUserLpOpportunity = createDeepEqualOutputSelector(
  selectLpOpportunitiesById,
  selectLpIdParamFromFilter,
  selectPortfolioCryptoHumanBalanceByFilter,
  selectAssets,
  selectMarketData,
  (
    lpOpportunitiesById,
    lpId,
    lpAssetBalance,
    assets,
    marketData,
  ): FoxFarmingEarnOpportunityType | undefined => {
    if (!lpId || !lpAssetBalance) return

    const marketDataPrice = marketData[lpId as AssetId]?.price
    const opportunityMetadata = lpOpportunitiesById[lpId]
    const baseLpEarnOpportunity = LP_EARN_OPPORTUNITIES[lpId]

    if (!opportunityMetadata) return

    const [underlyingToken0Amount, underlyingToken1Amount] =
      opportunityMetadata?.underlyingAssetIds.map((assetId, i) =>
        bnOrZero(lpAssetBalance)
          .times(
            fromBaseUnit(
              opportunityMetadata?.underlyingAssetRatios[i] ?? '0',
              assets[assetId].precision,
            ),
          )
          .toFixed(6)
          .toString(),
      )

    const opportunity = {
      ...baseLpEarnOpportunity,
      ...opportunityMetadata,
      opportunityName: opportunityMetadata.name,
      isLoaded: true,
      chainId: fromAssetId(lpId as AssetId).chainId,
      underlyingToken1Amount,
      underlyingToken0Amount,
      cryptoAmount: lpAssetBalance,
      fiatAmount: bnOrZero(lpAssetBalance)
        .times(marketDataPrice ?? '0')
        .toString(),
      icons: opportunityMetadata.underlyingAssetIds.map(assetId => assets[assetId].icon),
    }

    return opportunity
  },
)

// A staking opportunity parsed as an EarnOpportunityType
// TODO: testme
export const selectEarnUserStakingOpportunity = createDeepEqualOutputSelector(
  selectUserStakingOpportunityByUserStakingId,
  selectMarketData,
  selectAssets,
  (userStakingOpportunity, marketData, assets): FoxFarmingEarnOpportunityType | undefined => {
    if (!userStakingOpportunity || !marketData) return

    const marketDataPrice = marketData[userStakingOpportunity.underlyingAssetId]?.price

    return {
      ...LP_EARN_OPPORTUNITIES[userStakingOpportunity.assetId ?? ''],
      ...userStakingOpportunity,
      chainId: fromAssetId(userStakingOpportunity.assetId).chainId,
      cryptoAmount: userStakingOpportunity.stakedAmountCryptoPrecision ?? '0',
      fiatAmount: bnOrZero(userStakingOpportunity.stakedAmountCryptoPrecision)
        .times(marketDataPrice ?? '0')
        .toString(),
      stakedAmountCryptoPrecision: userStakingOpportunity.stakedAmountCryptoPrecision ?? '0',
      rewardsAmountCryptoPrecision: userStakingOpportunity.rewardsAmountCryptoPrecision ?? '0',
      opportunityName: userStakingOpportunity.name,
      icons: userStakingOpportunity.underlyingAssetIds.map(assetId => assets[assetId].icon),
    }
  },
)

// The same as the previous selector, but parsed as an EarnOpportunityType
// TODO: testme
export const selectAggregatedEarnUserLpOpportunity = createDeepEqualOutputSelector(
  selectLpOpportunitiesById,
  selectLpIdParamFromFilter,
  selectPortfolioCryptoHumanBalanceByFilter,
  selectAssets,
  selectMarketData,
  (
    lpOpportunitiesById,
    lpId,
    aggregatedLpAssetBalance,
    assets,
    marketData,
  ): FoxFarmingEarnOpportunityType | undefined => {
    if (!lpId || !aggregatedLpAssetBalance) return

    const marketDataPrice = marketData[lpId as AssetId]?.price
    const opportunityMetadata = lpOpportunitiesById[lpId]
    const baseLpEarnOpportunity = LP_EARN_OPPORTUNITIES[lpId]

    if (!opportunityMetadata || !baseLpEarnOpportunity) return

    const [underlyingToken0Amount, underlyingToken1Amount] =
      opportunityMetadata.underlyingAssetIds.map((assetId, i) =>
        bnOrZero(aggregatedLpAssetBalance)
          .times(
            fromBaseUnit(
              opportunityMetadata?.underlyingAssetRatios[i] ?? '0',
              assets[assetId].precision,
            ),
          )
          .toFixed(6)
          .toString(),
      )

    const opportunity = {
      ...baseLpEarnOpportunity,
      ...opportunityMetadata,
      isLoaded: true,
      chainId: fromAssetId(lpId as AssetId).chainId,
      underlyingToken1Amount,
      underlyingToken0Amount,
      cryptoAmount: aggregatedLpAssetBalance,
      fiatAmount: bnOrZero(aggregatedLpAssetBalance)
        .times(marketDataPrice ?? '0')
        .toString(),
      icons: opportunityMetadata.underlyingAssetIds.map(assetId => assets[assetId].icon),
      opportunityName: opportunityMetadata.name,
    }

    return opportunity
  },
)

// "Give me the total values over all my accounts aggregated into one for each opportunity, and then aggregated these into one final value"
// TODO: testme
export const selectAggregatedUserStakingOpportunity = createDeepEqualOutputSelector(
  selectAggregatedUserStakingOpportunities,
  (aggregatedOpportunities): (UserStakingOpportunity & OpportunityMetadata) | undefined =>
    aggregatedOpportunities.reduce<(UserStakingOpportunity & OpportunityMetadata) | undefined>(
      (acc, currentOpportunity) => {
        return {
          ...acc,
          ...currentOpportunity,
          stakedAmountCryptoPrecision: bnOrZero(currentOpportunity.stakedAmountCryptoPrecision)
            .plus(acc?.stakedAmountCryptoPrecision ?? 0)
            .toString(),
          rewardsAmountCryptoPrecision: bnOrZero(currentOpportunity.rewardsAmountCryptoPrecision)
            .plus(acc?.rewardsAmountCryptoPrecision ?? 0)
            .toString(),
        }
      },
      undefined,
    ),
)

// Useful when multiple accounts are staked on the same opportunity, so we can detect the highest staked balance one
export const selectHighestBalanceAccountIdByStakingId = createSelector(
  selectUserStakingOpportunitiesById,
  selectStakingIdParamFromFilter,
  (userStakingOpportunities, stakingId): AccountId | undefined => {
    if (!stakingId) return '*' // Narrowing flavoured type

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

    if (!foundUserStakingId) return undefined

    const [foundAccountId] = deserializeUserStakingId(foundUserStakingId)

    return foundAccountId
  },
)

// Useful when multiple accounts are staked on the same opportunity, so we can detect the highest staked balance one
export const selectHighestBalanceAccountIdByLpId = createSelector(
  selectPortfolioAccountBalances,
  selectLpIdParamFromFilter,
  (portfolioAccountBalances, lpId): AccountId | undefined => {
    if (!lpId) return '*' // Narrowing flavoured type

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

export const selectUnderlyingLpAssetsWithBalancesAndIcons = createSelector(
  selectLpIdParamFromFilter,
  selectLpOpportunitiesById,
  selectPortfolioCryptoHumanBalanceByFilter,
  selectAssets,
  (lpId, lpOpportunitiesById, lpAssetBalance, assets): AssetWithBalance[] | undefined => {
    if (!lpId) return
    const opportunityMetadata = lpOpportunitiesById[lpId as LpId]

    if (!opportunityMetadata) return
    const underlyingAssetsIcons = opportunityMetadata.underlyingAssetIds.map(
      assetId => assets[assetId].icon,
    )
    return opportunityMetadata.underlyingAssetIds.map((assetId, i) => ({
      ...assets[assetId],
      cryptoBalance: bnOrZero(lpAssetBalance)
        .times(
          fromBaseUnit(opportunityMetadata.underlyingAssetRatios[i], assets[assetId].precision),
        )
        .toFixed(6)
        .toString(),
      icons: [underlyingAssetsIcons[i]],
      allocationPercentage: '0.50',
    }))
  },
)
export const selectUnderlyingStakingAssetsWithBalancesAndIcons = createSelector(
  selectUserStakingOpportunityByUserStakingId,
  selectAssets,
  (userStakingOpportunities, assets): AssetWithBalance[] | undefined => {
    if (!userStakingOpportunities) return

    const underlyingAssetsIcons = userStakingOpportunities.underlyingAssetIds.map(
      assetId => assets[assetId].icon,
    )
    return userStakingOpportunities.underlyingAssetIds.map((assetId, i) => ({
      ...assets[assetId],
      cryptoBalance: bnOrZero(userStakingOpportunities.stakedAmountCryptoPrecision)
        .times(
          fromBaseUnit(
            userStakingOpportunities.underlyingAssetRatios[i] ?? '0',
            assets[assetId].precision,
          ),
        )
        .toFixed(6)
        .toString(),
      icons: [underlyingAssetsIcons[i]],
      allocationPercentage: '0.50',
    }))
  },
)
