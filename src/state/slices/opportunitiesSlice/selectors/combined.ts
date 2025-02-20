import { QueryStatus } from '@reduxjs/toolkit/dist/query'
import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset, MarketData } from '@shapeshiftoss/types'
import BigNumber from 'bignumber.js'
import partition from 'lodash/partition'
import type { BN } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import {
  selectChainIdParamFromFilter,
  selectIncludeEarnBalancesParamFromFilter,
  selectIncludeRewardsBalancesParamFromFilter,
} from 'state/selectors'

import type {
  AggregatedOpportunitiesByAssetIdReturn,
  LpEarnOpportunityType,
  OpportunityId,
  StakingEarnOpportunityType,
} from '../types'
import { DefiProvider, DefiType } from '../types'
import { getOpportunityAccessor, getUnderlyingAssetIdsBalances } from '../utils'
import { selectAssets } from './../../assetsSlice/selectors'
import { selectMarketDataUserCurrency } from './../../marketDataSlice/selectors'
import { selectAggregatedEarnUserLpOpportunities } from './lpSelectors'
import {
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectUserStakingOpportunitiesWithMetadataByFilter,
} from './stakingSelectors'

const makeClaimableStakingRewardsAmountUserCurrency = ({
  assets,
  maybeStakingOpportunity,
  marketDataUserCurrency,
}: {
  assets: Partial<Record<AssetId, Asset>>
  marketDataUserCurrency: Partial<Record<AssetId, MarketData>>
  maybeStakingOpportunity: StakingEarnOpportunityType | LpEarnOpportunityType
}): number => {
  if (maybeStakingOpportunity.type !== DefiType.Staking) return 0

  const stakingOpportunity = maybeStakingOpportunity as StakingEarnOpportunityType

  const rewardsAmountUserCurrency = Array.from(stakingOpportunity.rewardAssetIds ?? []).reduce(
    (sum, assetId, index) => {
      const asset = assets[assetId]
      if (!asset) return sum
      const marketDataPrice = marketDataUserCurrency[assetId]?.price
      const amountCryptoBaseUnit = stakingOpportunity?.rewardsCryptoBaseUnit?.amounts[index]
      const cryptoAmountPrecision = bnOrZero(
        stakingOpportunity?.rewardsCryptoBaseUnit?.claimable ? amountCryptoBaseUnit : '0',
      ).div(bnOrZero(10).pow(asset?.precision))

      return bnOrZero(cryptoAmountPrecision)
        .times(marketDataPrice ?? 0)
        .plus(bnOrZero(sum))
        .toNumber()
    },
    0,
  )

  return rewardsAmountUserCurrency
}
export const selectAggregatedEarnOpportunitiesByAssetId = createDeepEqualOutputSelector(
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectAggregatedEarnUserLpOpportunities,
  selectMarketDataUserCurrency,
  selectAssets,
  selectIncludeEarnBalancesParamFromFilter,
  selectIncludeRewardsBalancesParamFromFilter,
  selectChainIdParamFromFilter,
  (
    userStakingOpportunites,
    userLpOpportunities,
    marketDataUserCurrency,
    assets,
    includeEarnBalances,
    includeRewardsBalances,
    chainId,
  ): AggregatedOpportunitiesByAssetIdReturn[] => {
    const combined = [...userStakingOpportunites, ...userLpOpportunities]
    const totalFiatAmountByAssetId: Record<AssetId, BN> = {}
    const projectedAnnualizedYieldByAssetId: Record<AssetId, BN> = {}

    const isActiveOpportunityByAssetId = combined.reduce<Record<AssetId, boolean>>((acc, cur) => {
      const depositKey = getOpportunityAccessor({ provider: cur.provider, type: cur.type })
      const underlyingAssetIds = [cur[depositKey]].flat()
      underlyingAssetIds.forEach(assetId => {
        const asset = assets[assetId]
        if (!asset) return acc

        const underlyingAssetBalances = getUnderlyingAssetIdsBalances({
          ...cur,
          assets,
          marketDataUserCurrency,
        })

        const amountFiat =
          cur.type === DefiType.LiquidityPool
            ? underlyingAssetBalances[assetId].fiatAmount
            : cur.fiatAmount

        const maybeStakingRewardsAmountUserCurrency = makeClaimableStakingRewardsAmountUserCurrency(
          {
            maybeStakingOpportunity: cur,
            marketDataUserCurrency,
            assets,
          },
        )

        if (
          (!includeEarnBalances && !includeRewardsBalances && !bnOrZero(amountFiat).isZero()) ||
          (includeEarnBalances && !bnOrZero(amountFiat).isZero()) ||
          (includeRewardsBalances && bnOrZero(maybeStakingRewardsAmountUserCurrency).gt(0))
        ) {
          acc[assetId] = true
          return acc
        }
      })

      return acc
    }, {})

    const byAssetId = combined.reduce<Record<AssetId, AggregatedOpportunitiesByAssetIdReturn>>(
      (acc, cur) => {
        const depositKey = getOpportunityAccessor({ provider: cur.provider, type: cur.type })
        const underlyingAssetIds = [cur[depositKey]].flat()
        if (chainId && cur.chainId !== chainId) return acc
        underlyingAssetIds.forEach(assetId => {
          const isActiveAssetId = isActiveOpportunityByAssetId[assetId]
          if (!acc[assetId]) {
            acc[assetId] = {
              assetId,
              underlyingAssetIds: cur.underlyingAssetIds,
              apy: undefined,
              fiatAmount: '0',
              cryptoBalancePrecision: '0',
              fiatRewardsAmount: '0',
              opportunities: {
                staking: [],
                lp: [],
              },
            }
          }
          const asset = assets[assetId]
          if (!asset) return acc

          const underlyingAssetBalances = getUnderlyingAssetIdsBalances({
            ...cur,
            assets,
            marketDataUserCurrency,
          })

          const amountFiat =
            cur.type === DefiType.LiquidityPool
              ? underlyingAssetBalances[assetId].fiatAmount
              : cur.fiatAmount

          const maybeStakingRewardsAmountFiat = makeClaimableStakingRewardsAmountUserCurrency({
            maybeStakingOpportunity: cur,
            marketDataUserCurrency,
            assets,
          })

          const isActiveOpportunityByFilter =
            (!includeEarnBalances && !includeRewardsBalances) ||
            (includeEarnBalances && !bnOrZero(amountFiat).isZero()) ||
            (includeRewardsBalances && bnOrZero(maybeStakingRewardsAmountFiat).gt(0))

          acc[assetId].fiatRewardsAmount = bnOrZero(maybeStakingRewardsAmountFiat)
            .plus(acc[assetId].fiatRewardsAmount)
            .toFixed(2)

          if (isActiveOpportunityByFilter) {
            acc[assetId].opportunities[cur.type].push(cur.id as OpportunityId)
          }

          const cryptoBalancePrecision = bnOrZero(cur.cryptoAmountBaseUnit).div(
            bnOrZero(10)
              .pow(asset?.precision)
              .toString(),
          )
          acc[assetId].fiatAmount = bnOrZero(acc[assetId].fiatAmount)
            .plus(bnOrZero(amountFiat))
            .toFixed(2)

          // No active staking for the current AssetId, show the highest APY
          if (!isActiveAssetId) {
            if (cur.apy || acc[assetId].apy) {
              acc[assetId].apy = BigNumber.maximum(
                acc[assetId].apy ?? '0',
                cur.apy ?? '0',
              ).toFixed()
            }
          } else if (isActiveOpportunityByFilter) {
            totalFiatAmountByAssetId[assetId] = bnOrZero(totalFiatAmountByAssetId[assetId]).plus(
              BigNumber.max(amountFiat, 0),
            )

            if (cur.apy) {
              projectedAnnualizedYieldByAssetId[assetId] = bnOrZero(
                projectedAnnualizedYieldByAssetId[assetId],
              ).plus(BigNumber.max(amountFiat, 0).times(cur.apy))
            }
          }

          acc[assetId].cryptoBalancePrecision = bnOrZero(acc[assetId].cryptoBalancePrecision)
            .plus(
              bnOrZero(
                cur.type === DefiType.LiquidityPool
                  ? underlyingAssetBalances[assetId].cryptoBalancePrecision
                  : cryptoBalancePrecision,
              ),
            )
            .toString()
        })
        return acc
      },
      {},
    )

    for (const [assetId, totalVirtualFiatAmount] of Object.entries(totalFiatAmountByAssetId)) {
      // Use the highest APY for inactive opportunities
      if (!isActiveOpportunityByAssetId[assetId]) continue
      const apy = bnOrZero(projectedAnnualizedYieldByAssetId[assetId]).div(totalVirtualFiatAmount)
      byAssetId[assetId].apy = apy.toFixed()
    }

    const aggregatedEarnOpportunitiesByAssetId = Object.values(byAssetId)

    const sortedAggregatedEarnOpportunitiesByFiatAmount = aggregatedEarnOpportunitiesByAssetId.sort(
      (a, b) => (bnOrZero(a.fiatAmount).gte(bnOrZero(b.fiatAmount)) ? -1 : 1),
    )

    const [activeOpportunities, inactiveOpportunities] = partition(
      sortedAggregatedEarnOpportunitiesByFiatAmount,
      opportunity => !bnOrZero(opportunity.fiatAmount).isZero(),
    )
    inactiveOpportunities.sort((a, b) => (bnOrZero(a.apy).gte(bnOrZero(b.apy)) ? -1 : 1))

    const sortedOpportunitiesByFiatAmountAndApy = activeOpportunities.concat(inactiveOpportunities)

    const filterThorchainSaversZeroBalance = (
      opportunities: AggregatedOpportunitiesByAssetIdReturn[],
    ) => {
      return (
        opportunities
          .map(opportunity => {
            // Individual opportunities - all but savers
            const filteredStakingOpportunities = opportunity.opportunities.staking.filter(
              opportunityId => {
                const maybeOpportunity = combined.find(opp => opp.id === opportunityId)
                if (!maybeOpportunity) return false
                if (maybeOpportunity.provider !== DefiProvider.ThorchainSavers) return true
                return !bnOrZero(maybeOpportunity.fiatAmount).isZero()
              },
            )

            return {
              ...opportunity,
              opportunities: {
                // LP stays as-is, savers are OpportunityType.Staking
                ...opportunity.opportunities,
                staking: filteredStakingOpportunities,
              },
            }
          })
          // Second pass on the actual aggregate. These are *not* indivial opportunities but an aggregation of many.
          // We want to filter savers out, but keep the rest
          .filter(aggregate => {
            // Filter out the entire aggregate if it has no opportunities left after filtering savers out
            return (
              aggregate.opportunities.staking.length > 0 || aggregate.opportunities.lp.length > 0
            )
          })
      )
    }

    if (!includeEarnBalances && !includeRewardsBalances)
      return filterThorchainSaversZeroBalance(sortedOpportunitiesByFiatAmountAndApy)

    const withEarnBalances = aggregatedEarnOpportunitiesByAssetId.filter(opportunity =>
      Boolean(includeEarnBalances && !bnOrZero(opportunity.fiatAmount).isZero()),
    )
    const withRewardsBalances = Object.values(byAssetId).filter(opportunity =>
      Boolean(includeRewardsBalances && bnOrZero(opportunity.fiatRewardsAmount).gt(0)),
    )

    return filterThorchainSaversZeroBalance(withEarnBalances.concat(withRewardsBalances))
  },
)

export const selectClaimableRewards = createDeepEqualOutputSelector(
  selectUserStakingOpportunitiesWithMetadataByFilter,
  selectAssets,
  selectMarketDataUserCurrency,
  (userStakingOpportunitesWithMetadata, assets, marketData): string => {
    return userStakingOpportunitesWithMetadata
      .reduce<BN>((totalSum, stakingOpportunityWithMetadata) => {
        const rewardsAmountFiat = Array.from(
          stakingOpportunityWithMetadata?.rewardAssetIds ?? [],
        ).reduce((currentSum, assetId, index) => {
          const asset = assets[assetId]
          if (!asset) return currentSum
          const marketDataPrice = marketData[assetId]?.price
          const amountCryptoBaseUnit =
            stakingOpportunityWithMetadata?.rewardsCryptoBaseUnit?.amounts[index]
          const cryptoAmountPrecision = bnOrZero(
            stakingOpportunityWithMetadata?.rewardsCryptoBaseUnit?.claimable
              ? amountCryptoBaseUnit
              : '0',
          ).div(bnOrZero(10).pow(asset?.precision))

          return bnOrZero(cryptoAmountPrecision)
            .times(marketDataPrice ?? 0)
            .plus(bnOrZero(currentSum))
            .toNumber()
        }, 0)
        totalSum = bnOrZero(totalSum).plus(rewardsAmountFiat)
        return totalSum
      }, bn(0))
      .toFixed()
  },
)

export const selectOpportunityApiPending = (state: ReduxState) =>
  Object.values(state.opportunitiesApi.queries).some(query => query?.status === QueryStatus.pending)
