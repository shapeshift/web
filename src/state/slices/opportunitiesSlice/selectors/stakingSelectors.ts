import { createSelector } from '@reduxjs/toolkit'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { foxAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { isToken } from '@shapeshiftoss/utils'
import partition from 'lodash/partition'
import pickBy from 'lodash/pickBy'
import uniqBy from 'lodash/uniqBy'

import { selectAssets } from '../../assetsSlice/selectors'
import { selectEnabledWalletAccountIds } from '../../common-selectors'
import { selectMarketDataUserCurrency } from '../../marketDataSlice/selectors'
import { opportunities } from '../opportunitiesSlice'
import type { CosmosSdkStakingSpecificUserStakingOpportunity } from '../resolvers/cosmosSdk/types'
import { makeOpportunityTotalFiatBalance } from '../resolvers/cosmosSdk/utils'
import type {
  OpportunityMetadata,
  StakingEarnOpportunityType,
  StakingId,
  UserStakingId,
  UserStakingOpportunity,
  UserStakingOpportunityWithMetadata,
} from '../types'
import { DefiProvider } from '../types'
import {
  deserializeUserStakingId,
  filterUserStakingIdByStakingIdCompareFn,
  isFoxEthStakingAssetId,
  makeOpportunityIcons,
  supportsUndelegations,
} from '../utils'

import type { AssetWithBalance } from '@/features/defi/components/Overview/Overview'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { isSome } from '@/lib/utils'
import { createDeepEqualOutputSelector } from '@/state/selector-utils'
import {
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  selectDefiProviderParamFromFilter,
  selectDefiTypeParamFromFilter,
  selectStakingIdParamFromFilter,
  selectUserStakingIdParamFromFilter,
  selectValidatorIdParamFromFilter,
} from '@/state/selectors'

export const selectStakingIds = createDeepEqualOutputSelector(
  opportunities.selectors.selectStakingIds,
  ids => ids,
)

export const selectUserStakingIds = createDeepEqualOutputSelector(
  selectEnabledWalletAccountIds,
  opportunities.selectors.selectUserStakingIds,
  (walletAccountIds, userStakingIds): UserStakingId[] =>
    userStakingIds.filter(userStakingId =>
      walletAccountIds.includes(deserializeUserStakingId(userStakingId as UserStakingId)[0]),
    ),
)

export const selectStakingOpportunitiesByAccountId = createDeepEqualOutputSelector(
  opportunities.selectors.selectStakingByAccountId,
  byId => byId,
)

export const selectStakingAccountIds = createDeepEqualOutputSelector(
  selectStakingOpportunitiesByAccountId,
  (byAccountId): AccountId[] => Object.keys(byAccountId),
)

export const selectUserStakingOpportunitiesById = createSelector(
  selectEnabledWalletAccountIds,
  opportunities.selectors.selectUserStakingOpportunitiesById,
  (walletAccountIds, userStakingById) => {
    const result = pickBy(userStakingById, (_userStaking, userStakingId) =>
      walletAccountIds.includes(deserializeUserStakingId(userStakingId as UserStakingId)[0]),
    )
    return result
  },
)

export const selectStakingOpportunityByFilter = createDeepEqualOutputSelector(
  opportunities.selectors.selectStakingOpportunitiesById,
  selectDefiProviderParamFromFilter,
  selectDefiTypeParamFromFilter,
  selectAssetIdParamFromFilter,
  selectValidatorIdParamFromFilter,
  selectStakingIdParamFromFilter,
  (
    stakingOpportunitiesById,
    defiProvider,
    defiType,
    assetId,
    validatorId,
    stakingId,
  ): OpportunityMetadata | undefined => {
    return Object.values(stakingOpportunitiesById).find(
      stakingOpportunity =>
        stakingOpportunity &&
        (!defiProvider || defiProvider === stakingOpportunity.provider) &&
        (!defiType || defiType === stakingOpportunity.type) &&
        (!assetId || assetId === stakingOpportunity.assetId) &&
        (!(validatorId || stakingId) || [validatorId, stakingId].includes(stakingOpportunity.id)),
    )
  },
)

export const selectUserStakingOpportunitiesWithMetadataByFilter = createSelector(
  selectUserStakingOpportunitiesById,
  opportunities.selectors.selectStakingOpportunitiesById,
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  selectDefiProviderParamFromFilter,
  (
    userStakingOpportunitiesById,
    stakingOpportunitiesById,
    accountId,
    assetId,
    defiProvider,
  ): UserStakingOpportunityWithMetadata[] =>
    Object.entries(userStakingOpportunitiesById)
      .filter(([userStakingId]) => {
        const [userStakingAccountId, stakingId] = deserializeUserStakingId(
          userStakingId as UserStakingId,
        )

        return (
          (!defiProvider || defiProvider === stakingOpportunitiesById[stakingId]?.provider) &&
          (!accountId || accountId === userStakingAccountId) &&
          (!assetId || assetId === (stakingOpportunitiesById[stakingId]?.assetId ?? ''))
        )
      })
      .map(([userStakingId, userStakingOpportunity]) => {
        const [, stakingId] = deserializeUserStakingId(userStakingId as UserStakingId)
        if (!stakingOpportunitiesById[stakingId] || !userStakingOpportunity) return undefined

        const userStakingOpportunityWithMetadata = {
          ...userStakingOpportunity,
          ...stakingOpportunitiesById[stakingId],
          userStakingId,
        } as UserStakingOpportunityWithMetadata

        return userStakingOpportunityWithMetadata
      })
      .filter(isSome),
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
  opportunities.selectors.selectStakingOpportunitiesById,
  (
    userStakingOpportunities,
    userStakingId,
    stakingId,
    stakingOpportunities,
    // Don't make this return type undefined, this will rug the UserStakingOpportunityWithMetadata union/intersection guarantees
  ): UserStakingOpportunityWithMetadata | null => {
    if (!userStakingId) return null // Narrowing flavoured template litteral type

    const userOpportunity = userStakingOpportunities[userStakingId]
    const opportunityMetadata = stakingOpportunities[stakingId]

    if (!opportunityMetadata) return null

    return {
      // Overwritten by userOpportunity if it exists, else we keep defaulting to 0
      stakedAmountCryptoBaseUnit: '0',
      rewardsCryptoBaseUnit: {
        amounts: (opportunityMetadata.rewardAssetIds ?? []).map(_ => '0') as
          | []
          | [string, string]
          | [string],
        claimable: false,
      },
      isLoaded: false,
      ...userOpportunity,
      ...opportunityMetadata,
      userStakingId,
    }
  },
)

export const selectHasClaimByUserStakingId = createSelector(
  selectUserStakingOpportunityByUserStakingId,
  (userStakingOpportunity): boolean =>
    Boolean(
      userStakingOpportunity?.rewardsCryptoBaseUnit?.claimable &&
        userStakingOpportunity?.rewardsCryptoBaseUnit?.amounts.some(rewardAmount =>
          bnOrZero(rewardAmount).gt(0),
        ),
    ),
)

// "Give me the staking values of all my accounts for that specific opportunity"
export const selectUserStakingOpportunitiesByStakingId = createDeepEqualOutputSelector(
  selectUserStakingOpportunitiesById,
  selectUserStakingIds,
  opportunities.selectors.selectStakingOpportunitiesById,
  selectStakingIds,
  (
    userStakingOpportunities,
    userStakingOpportunityIds,
    stakingOpportunities,
    stakingIds,
  ): Record<StakingId, UserStakingOpportunityWithMetadata[]> =>
    stakingIds.reduce<Record<StakingId, UserStakingOpportunityWithMetadata[]>>((acc, stakingId) => {
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

const getAggregatedUserStakingOpportunityByStakingId = (
  userStakingOpportunities: UserStakingOpportunityWithMetadata[],
): UserStakingOpportunityWithMetadata | undefined => {
  if (!userStakingOpportunities?.length) return

  return userStakingOpportunities.reduce<UserStakingOpportunityWithMetadata | undefined>(
    (acc, userStakingOpportunity) => {
      const { userStakingId, ...userStakingOpportunityWithoutUserStakingId } =
        userStakingOpportunity

      const stakedAmountCryptoBaseUnit = bnOrZero(acc?.stakedAmountCryptoBaseUnit)
        .plus(userStakingOpportunity.stakedAmountCryptoBaseUnit)
        .toFixed()

      const rewardsCryptoBaseUnit = {
        amounts: (userStakingOpportunity.rewardsCryptoBaseUnit?.amounts.map((amount, i) =>
          bnOrZero(acc?.rewardsCryptoBaseUnit?.amounts[i])
            .plus(amount)
            .toString(),
        ) ?? []) as [string, string] | [string] | [],
        claimable: userStakingOpportunity.isClaimableRewards,
      }

      const currentUndelegations = supportsUndelegations(userStakingOpportunity)
        ? Array.isArray(userStakingOpportunity.undelegations)
          ? userStakingOpportunity.undelegations
          : []
        : []

      const accUndelegations =
        (acc as CosmosSdkStakingSpecificUserStakingOpportunity)?.undelegations ?? []

      const undelegations = [...currentUndelegations, ...accUndelegations]

      return {
        ...userStakingOpportunityWithoutUserStakingId,
        stakedAmountCryptoBaseUnit,
        rewardsCryptoBaseUnit,
        undelegations,
        userStakingId,
      }
    },
    undefined,
  )
}

// "Give me the total values over all my accounts aggregated into one for that specific opportunity"
export const selectAggregatedUserStakingOpportunityByStakingId = createDeepEqualOutputSelector(
  selectUserStakingOpportunitiesByStakingId,
  selectStakingIdParamFromFilter,
  (userStakingOpportunitiesById, stakingId): UserStakingOpportunityWithMetadata | undefined => {
    if (!stakingId) return

    const userStakingOpportunities = userStakingOpportunitiesById[stakingId]

    return getAggregatedUserStakingOpportunityByStakingId(userStakingOpportunities)
  },
)

export const selectAggregatedEarnUserStakingOpportunityByStakingId = createDeepEqualOutputSelector(
  selectAggregatedUserStakingOpportunityByStakingId,
  selectMarketDataUserCurrency,
  selectAssets,
  (opportunity, marketData, assets): StakingEarnOpportunityType | undefined => {
    if (!opportunity) return

    const asset = assets[opportunity.assetId]
    const underlyingAsset = assets[opportunity.underlyingAssetId]

    const aggregatedEarnUserStakingOpportunity: StakingEarnOpportunityType = Object.assign(
      {},
      isFoxEthStakingAssetId(opportunity.assetId)
        ? {
            contractAddress: fromAssetId(opportunity.assetId).assetReference,
            rewardAddress: fromAssetId(foxAssetId).assetReference,
          }
        : {},
      opportunity,
      {
        chainId: fromAssetId(opportunity.assetId).chainId,
        cryptoAmountBaseUnit: opportunity.stakedAmountCryptoBaseUnit,
        cryptoAmountPrecision: bnOrZero(opportunity.stakedAmountCryptoBaseUnit)
          .div(bn(10).pow(asset?.precision ?? underlyingAsset?.precision ?? 1))
          .toFixed(),
        fiatAmount: bnOrZero(
          fromBaseUnit(opportunity.stakedAmountCryptoBaseUnit, asset?.precision ?? 18),
        )
          .times(marketData[opportunity.underlyingAssetId as AssetId]?.price ?? '0')
          .toString(),
        isLoaded: true,
        icons: makeOpportunityIcons({ opportunity, assets }),
        opportunityName: opportunity.name,
      },
    )
    return aggregatedEarnUserStakingOpportunity
  },
)

// "Give me the total values over all my accounts aggregated into one for each opportunity"
// TODO: testme
export const selectAggregatedUserStakingOpportunities = createDeepEqualOutputSelector(
  selectUserStakingOpportunitiesByStakingId,
  (userStakingOpportunitiesByStakingId): UserStakingOpportunityWithMetadata[] => {
    return Object.values(userStakingOpportunitiesByStakingId)
      .filter(isSome)
      .map(getAggregatedUserStakingOpportunityByStakingId)
      .filter(isSome)
  },
)

// The same as selectAggregatedUserStakingOpportunities, but parsed as an EarnOpportunityType
// TODO: testme
export const selectAggregatedEarnUserStakingOpportunities = createDeepEqualOutputSelector(
  selectAggregatedUserStakingOpportunities,
  selectMarketDataUserCurrency,
  selectAssets,
  (aggregatedUserStakingOpportunities, marketData, assets): StakingEarnOpportunityType[] =>
    aggregatedUserStakingOpportunities.map(opportunity => {
      if (opportunity.provider === 'ETH/FOX Staking') {
        console.log(
          '[stakingSelectors] ETH_FOX opportunity before mapping:',
          JSON.stringify(
            {
              id: opportunity.id,
              assetId: opportunity.assetId,
              underlyingAssetId: opportunity.underlyingAssetId,
              underlyingAssetIds: opportunity.underlyingAssetIds,
            },
            null,
            2,
          ),
        )
      }

      const asset = assets[opportunity.assetId]
      const underlyingAsset = assets[opportunity.underlyingAssetId]

      const aggregatedEarnUserStakingOpportunity: StakingEarnOpportunityType = Object.assign(
        {},
        (() => {
          if (opportunity.provider === DefiProvider.CosmosSdk && opportunity.id) {
            return { contractAddress: fromAccountId(opportunity.id).account }
          }

          if (isFoxEthStakingAssetId(opportunity.assetId))
            return {
              contractAddress: fromAssetId(opportunity.assetId).assetReference,
              rewardAddress: fromAssetId(foxAssetId).assetReference,
            }

          if (isToken(opportunity.underlyingAssetId)) {
            return {
              contractAddress: fromAssetId(opportunity.underlyingAssetId).assetReference,
            }
          }
          return {}
        })(),
        opportunity,
        {
          chainId: fromAssetId(opportunity.assetId).chainId,
          cryptoAmountPrecision: bnOrZero(opportunity.stakedAmountCryptoBaseUnit)
            .div(bn(10).pow(asset?.precision ?? underlyingAsset?.precision ?? 1))
            .toFixed(),
          cryptoAmountBaseUnit: opportunity.stakedAmountCryptoBaseUnit,
          fiatAmount: makeOpportunityTotalFiatBalance({
            opportunity,
            marketData,
            assets,
          }).toString(),
          isLoaded: true,
          icons: makeOpportunityIcons({ opportunity, assets }),
          opportunityName: opportunity.name,
        },
      )

      if (opportunity.provider === 'ETH/FOX Staking') {
        console.log(
          '[stakingSelectors] ETH_FOX opportunity after mapping:',
          JSON.stringify(
            {
              id: aggregatedEarnUserStakingOpportunity.id,
              assetId: aggregatedEarnUserStakingOpportunity.assetId,
              underlyingAssetId: aggregatedEarnUserStakingOpportunity.underlyingAssetId,
              underlyingAssetIds: aggregatedEarnUserStakingOpportunity.underlyingAssetIds,
            },
            null,
            2,
          ),
        )
      }

      return aggregatedEarnUserStakingOpportunity
    }),
)

export const selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty =
  createDeepEqualOutputSelector(
    selectAggregatedEarnUserStakingOpportunities,
    opportunities.selectors.selectStakingOpportunitiesById,
    selectAssets,
    (
      aggregatedEarnUserStakingOpportunities,
      stakingOpportunitiesById,
      assets,
    ): StakingEarnOpportunityType[] => {
      const emptyEarnOpportunitiesTypes = Object.values(stakingOpportunitiesById)
        .filter(isSome)
        .reduce((acc, opportunity) => {
          const earnOpportunity = Object.assign(
            {},
            (() => {
              if (opportunity.provider === DefiProvider.CosmosSdk)
                return { contractAddress: fromAccountId(opportunity.id).account }

              if (isFoxEthStakingAssetId(opportunity.assetId))
                return {
                  rewardAddress: fromAssetId(foxAssetId).assetReference,
                  contractAddress: fromAssetId(opportunity.assetId).assetReference,
                }

              if (isToken(opportunity.underlyingAssetId))
                return {
                  contractAddress: fromAssetId(opportunity.underlyingAssetId).assetReference,
                }

              return {}
            })(),
            opportunity,
            {
              chainId: fromAssetId(opportunity.assetId).chainId,
              cryptoAmountBaseUnit: '0',
              cryptoAmountPrecision: '0',
              fiatAmount: '0',
              isLoaded: true,
              icons: makeOpportunityIcons({ opportunity, assets }),
              opportunityName: opportunity.name,
            },
          )

          acc.push(earnOpportunity)

          return acc
        }, [] as StakingEarnOpportunityType[])

      // Keep only the version with actual data if it exists, else keep the zero'd out version
      const aggregatedEarnUserStakingOpportunitiesIncludeEmpty = uniqBy(
        [...aggregatedEarnUserStakingOpportunities, ...emptyEarnOpportunitiesTypes],
        ({ contractAddress, assetId, id }) => id ?? contractAddress ?? assetId,
      )

      const results = aggregatedEarnUserStakingOpportunitiesIncludeEmpty.filter(opportunity => {
        if (opportunity?.expired) {
          const undelegations = [
            ...(supportsUndelegations(opportunity) ? opportunity.undelegations : []),
          ]

          return (
            !bnOrZero(opportunity.stakedAmountCryptoBaseUnit).isZero() ||
            opportunity?.rewardsCryptoBaseUnit?.amounts.some(rewardsAmount =>
              bnOrZero(rewardsAmount).gt(0),
            ) ||
            undelegations.some(undelegation =>
              bnOrZero(undelegation.undelegationAmountCryptoBaseUnit).gt(0),
            )
          )
        }

        return true
      })

      const sortedResultsByFiatAmount = results.sort((a, b) =>
        bnOrZero(a.fiatAmount).gte(bnOrZero(b.fiatAmount)) ? -1 : 1,
      )

      const [activeResults, inactiveResults] = partition(
        sortedResultsByFiatAmount,
        opportunity =>
          bnOrZero(opportunity.fiatAmount).gt(0) ||
          opportunity.rewardsCryptoBaseUnit?.amounts.some(rewardsAmount =>
            bnOrZero(rewardsAmount).gt(0),
          ),
      )
      inactiveResults.sort((a, b) => (bnOrZero(a.apy).gte(bnOrZero(b.apy)) ? -1 : 1))

      return activeResults.concat(inactiveResults)
    },
  )

// A staking opportunity parsed as an EarnOpportunityType
// TODO: testme
export const selectEarnUserStakingOpportunityByUserStakingId = createDeepEqualOutputSelector(
  selectUserStakingOpportunityByUserStakingId,
  selectMarketDataUserCurrency,
  selectAssets,
  (userStakingOpportunity, marketData, assets): StakingEarnOpportunityType | undefined => {
    if (!userStakingOpportunity || !marketData) return

    const asset = assets[userStakingOpportunity.assetId]
    const underlyingAsset = assets[userStakingOpportunity.underlyingAssetId]

    const marketDataPrice = marketData[asset?.assetId ?? underlyingAsset?.assetId ?? '']?.price

    const earnUserStakingOpportunity: StakingEarnOpportunityType = {
      ...userStakingOpportunity,
      isLoaded: userStakingOpportunity.isLoaded,
      chainId: fromAssetId(userStakingOpportunity.assetId).chainId,
      cryptoAmountBaseUnit: userStakingOpportunity.stakedAmountCryptoBaseUnit ?? '0',
      cryptoAmountPrecision: bnOrZero(userStakingOpportunity.stakedAmountCryptoBaseUnit)
        .div(bn(10).pow(asset?.precision ?? underlyingAsset?.precision ?? 1))
        .toFixed(),
      fiatAmount: bnOrZero(userStakingOpportunity.stakedAmountCryptoBaseUnit)
        .div(bn(10).pow(bnOrZero(asset?.precision ?? underlyingAsset?.precision)))
        .times(marketDataPrice ?? '0')
        .toString(),
      stakedAmountCryptoBaseUnit: userStakingOpportunity.stakedAmountCryptoBaseUnit ?? '0',
      opportunityName: userStakingOpportunity.name,
      icons: makeOpportunityIcons({ opportunity: userStakingOpportunity, assets }),
      contractAddress: isFoxEthStakingAssetId(userStakingOpportunity.assetId)
        ? fromAssetId(userStakingOpportunity.assetId).assetReference
        : undefined,
      rewardAddress: isFoxEthStakingAssetId(userStakingOpportunity.assetId)
        ? fromAssetId(foxAssetId).assetReference
        : undefined,
    }

    return earnUserStakingOpportunity
  },
)

// Useful when multiple accounts are staked on the same opportunity, so we can detect the highest staked balance one
export const selectHighestStakingBalanceAccountIdByStakingId = createSelector(
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
        bnOrZero(userStakingOpportunityB.stakedAmountCryptoBaseUnit)
          .minus(userStakingOpportunityA.stakedAmountCryptoBaseUnit)
          .toNumber(),
      )?.[0]

    const foundUserStakingId = foundEntry?.[0]

    if (!foundUserStakingId) return undefined

    const [foundAccountId] = deserializeUserStakingId(foundUserStakingId)

    return foundAccountId
  },
)

export const selectUnderlyingStakingAssetsWithBalancesAndIcons = createSelector(
  selectUserStakingOpportunityByUserStakingId,
  selectAssets,
  (userStakingOpportunity, assets): AssetWithBalance[] | undefined => {
    if (!userStakingOpportunity) return

    const asset = assets[userStakingOpportunity.assetId]
    const underlyingAsset = assets[userStakingOpportunity.underlyingAssetId]

    const underlyingAssetsIcons = userStakingOpportunity.underlyingAssetIds
      .map(assetId => assets[assetId]?.icon)
      .filter(isSome)
    return userStakingOpportunity.underlyingAssetIds
      .map((assetId, i, original) => {
        const underlyingAssetIteratee = assets[assetId]

        return underlyingAssetIteratee
          ? {
              ...underlyingAssetIteratee,
              cryptoBalancePrecision: bnOrZero(userStakingOpportunity.stakedAmountCryptoBaseUnit)
                .times(
                  fromBaseUnit(
                    userStakingOpportunity.underlyingAssetRatiosBaseUnit[i],
                    underlyingAssetIteratee.precision,
                  ) ?? '1',
                )
                .div(bn(10).pow(asset?.precision ?? underlyingAsset?.precision ?? 1))
                .toFixed(),
              icons: [underlyingAssetsIcons[i]],
              allocationPercentage:
                userStakingOpportunity.underlyingAssetWeightPercentageDecimal?.[i] ??
                bn('1').div(original.length).toString(),
            }
          : undefined
      })
      .filter(isSome)
  },
)
