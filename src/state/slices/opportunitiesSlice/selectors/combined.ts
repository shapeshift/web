import { QueryStatus } from '@reduxjs/toolkit/dist/query'
import type { AssetId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import isEmpty from 'lodash/isEmpty'
import type { BN } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import {
  selectIncludeEarnBalancesParamFromFilter,
  selectIncludeRewardsBalancesParamFromFilter,
} from 'state/selectors'

import { selectAssets } from '../../assetsSlice/selectors'
import { selectMarketDataSortedByMarketCap } from '../../marketDataSlice/selectors'
import type {
  AggregatedOpportunitiesByAssetIdReturn,
  AggregatedOpportunitiesByProviderReturn,
  OpportunityId,
  StakingEarnOpportunityType,
} from '../types'
import { getUnderlyingAssetIdsBalances } from '../utils'
import { selectAggregatedEarnUserLpOpportunities } from './lpSelectors'
import {
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectUserStakingOpportunitiesWithMetadataByFilter,
} from './stakingSelectors'

type GetOpportunityAccessorArgs = { provider: DefiProvider; type: DefiType }
type GetOpportunityAccessorReturn = 'underlyingAssetId' | 'underlyingAssetIds'
type GetOpportunityAccessor = (args: GetOpportunityAccessorArgs) => GetOpportunityAccessorReturn

const getOpportunityAccessor: GetOpportunityAccessor = ({ provider, type }) => {
  if (type === DefiType.Staking) {
    if (provider === DefiProvider.EthFoxStaking) {
      return 'underlyingAssetId'
    }
  }
  return 'underlyingAssetIds'
}

export const selectAggregatedEarnOpportunitiesByAssetId = createDeepEqualOutputSelector(
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectAggregatedEarnUserLpOpportunities,
  selectMarketDataSortedByMarketCap,
  selectAssets,
  selectIncludeEarnBalancesParamFromFilter,
  selectIncludeRewardsBalancesParamFromFilter,
  (
    userStakingOpportunites,
    userLpOpportunities,
    marketData,
    assets,
    includeEarnBalances,
    includeRewardsBalances,
  ): AggregatedOpportunitiesByAssetIdReturn[] => {
    const combined = [...userStakingOpportunites, ...userLpOpportunities]
    const totalFiatAmountByAssetId: Record<AssetId, BN> = {}
    const projectedAnnualizedYieldByAssetId: Record<AssetId, BN> = {}
    const byAssetId = combined.reduce<Record<AssetId, AggregatedOpportunitiesByAssetIdReturn>>(
      (acc, cur) => {
        const depositKey = getOpportunityAccessor({ provider: cur.provider, type: cur.type })
        const underlyingAssetIds = [cur[depositKey]].flat()
        underlyingAssetIds.forEach(assetId => {
          if (!acc[assetId]) {
            acc[assetId] = {
              assetId,
              underlyingAssetIds: cur.underlyingAssetIds,
              netApy: '0',
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

          acc[assetId].opportunities[cur.type].push(cur.assetId as OpportunityId)
          if (cur.type === DefiType.Staking) {
            const stakingOpportunity = cur as StakingEarnOpportunityType
            const rewardsAmountFiat = Array.from(stakingOpportunity.rewardAssetIds ?? []).reduce(
              (sum, assetId, index) => {
                const asset = assets[assetId]
                if (!asset) return sum
                const marketDataPrice = marketData[assetId]?.price
                const amountCryptoBaseUnit =
                  stakingOpportunity?.rewardsCryptoBaseUnit?.amounts[index]
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
            acc[assetId].fiatRewardsAmount = bnOrZero(rewardsAmountFiat)
              .plus(acc[assetId].fiatRewardsAmount)
              .toFixed(2)
          }
          const underlyingAssetBalances = getUnderlyingAssetIdsBalances({
            ...cur,
            assets,
            marketData,
          })
          const cryptoBalancePrecision = bnOrZero(cur.cryptoAmountBaseUnit).div(
            bnOrZero(10).pow(asset?.precision).toString(),
          )
          acc[assetId].fiatAmount = bnOrZero(acc[assetId].fiatAmount)
            .plus(
              bnOrZero(
                cur.type === DefiType.LiquidityPool
                  ? underlyingAssetBalances[assetId].fiatAmount
                  : cur.fiatAmount,
              ),
            )
            .toFixed(2)

          totalFiatAmountByAssetId[assetId] = bnOrZero(totalFiatAmountByAssetId[assetId]).plus(1) // 1 virtual buck
          projectedAnnualizedYieldByAssetId[assetId] = bnOrZero(
            projectedAnnualizedYieldByAssetId[assetId],
          ).plus(bnOrZero(1).times(cur.apy)) // 1 virtual buck

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
      const netApy = bnOrZero(projectedAnnualizedYieldByAssetId[assetId]).div(
        totalVirtualFiatAmount,
      )
      byAssetId[assetId].netApy = netApy.toFixed()
    }

    const withEarnBalances = Object.values(byAssetId).filter(opportunity =>
      Boolean(includeEarnBalances && bnOrZero(opportunity.fiatAmount).gt(0)),
    )
    const withRewardsBalances = Object.values(byAssetId).filter(opportunity =>
      Boolean(includeRewardsBalances && bnOrZero(opportunity.fiatRewardsAmount).gt(0)),
    )

    return [...withEarnBalances, ...withRewardsBalances]
  },
)

export const selectClaimableRewards = createDeepEqualOutputSelector(
  selectUserStakingOpportunitiesWithMetadataByFilter,
  selectAssets,
  selectMarketDataSortedByMarketCap,
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

export const selectClaimableRewards = createDeepEqualOutputSelector(
  selectUserStakingOpportunitiesWithMetadataByFilter,
  selectAssets,
  selectMarketDataSortedByMarketCap,
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

export const selectAggregatedEarnOpportunitiesByProvider = createDeepEqualOutputSelector(
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectAggregatedEarnUserLpOpportunities,
  selectMarketDataSortedByMarketCap,
  selectAssets,
  selectIncludeEarnBalancesParamFromFilter,
  selectIncludeRewardsBalancesParamFromFilter,
  (
    userStakingOpportunites,
    userLpOpportunities,
    marketData,
    assets,
    includeEarnBalances,
    includeRewardsBalances,
  ): AggregatedOpportunitiesByProviderReturn[] => {
    if (isEmpty(marketData)) return []
    const totalFiatAmountByProvider = {} as Record<DefiProvider, BN>
    const projectedAnnualizedYieldByProvider = {} as Record<DefiProvider, BN>
    const combined = [...userStakingOpportunites, ...userLpOpportunities]

    const makeEmptyPayload = (provider: DefiProvider): AggregatedOpportunitiesByProviderReturn => ({
      provider,
      netApy: '0',
      fiatAmount: '0',
      fiatRewardsAmount: '0',
      opportunities: {
        lp: [],
        staking: [],
      },
    })

    const initial = {
      [DefiProvider.Idle]: makeEmptyPayload(DefiProvider.Idle),
      [DefiProvider.Yearn]: makeEmptyPayload(DefiProvider.Yearn),
      [DefiProvider.ShapeShift]: makeEmptyPayload(DefiProvider.ShapeShift),
      [DefiProvider.EthFoxStaking]: makeEmptyPayload(DefiProvider.EthFoxStaking),
      [DefiProvider.UniV2]: makeEmptyPayload(DefiProvider.UniV2),
      [DefiProvider.CosmosSdk]: makeEmptyPayload(DefiProvider.CosmosSdk),
      [DefiProvider.OsmosisLp]: makeEmptyPayload(DefiProvider.OsmosisLp),
      [DefiProvider.ThorchainSavers]: makeEmptyPayload(DefiProvider.ThorchainSavers),
    } as const

    const byProvider = combined.reduce<
      Record<DefiProvider, AggregatedOpportunitiesByProviderReturn>
    >((acc, cur) => {
      const { provider } = cur

      totalFiatAmountByProvider[provider] = bnOrZero(totalFiatAmountByProvider[provider]).plus(1) // 1 virtual buck
      projectedAnnualizedYieldByProvider[provider] = bnOrZero(
        projectedAnnualizedYieldByProvider[provider],
      ).plus(bnOrZero(1).times(cur.apy)) // 1 virtual buck

      if (cur.type === DefiType.LiquidityPool) {
        acc[provider].opportunities.lp.push(cur.id)
      }

      if (cur.type === DefiType.Staking) {
        acc[provider].opportunities.staking.push(cur.id)
        const stakingOpportunity = cur as StakingEarnOpportunityType
        const rewardsAmountFiat = Array.from(stakingOpportunity.rewardAssetIds ?? []).reduce(
          (sum, assetId, index) => {
            const asset = assets[assetId]
            if (!asset) return sum
            const marketDataPrice = marketData[assetId]?.price

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

        acc[provider].fiatRewardsAmount = bnOrZero(rewardsAmountFiat)
          .plus(acc[provider].fiatRewardsAmount)
          .toFixed(2)
      }

      acc[provider].fiatAmount = bnOrZero(acc[provider].fiatAmount)
        .plus(bnOrZero(cur.fiatAmount))
        .toFixed(2)

      return acc
    }, initial)

    for (const [provider, totalVirtualFiatAmount] of Object.entries(totalFiatAmountByProvider)) {
      const netApy = bnOrZero(projectedAnnualizedYieldByProvider[provider as DefiProvider]).div(
        totalVirtualFiatAmount,
      )
      byProvider[provider as DefiProvider].netApy = netApy.toFixed()
    }

    const aggregatedEarnOpportunitiesByProvider = Object.values(byProvider).reduce<
      AggregatedOpportunitiesByProviderReturn[]
    >((acc, cur) => {
      if (cur.opportunities.lp.length || cur.opportunities.staking.length) acc.push(cur)
      return acc
    }, [])

    const withEarnBalances = Object.values(aggregatedEarnOpportunitiesByProvider).filter(
      opportunity => Boolean(includeEarnBalances && bnOrZero(opportunity.fiatAmount).gt(0)),
    )
    const withRewardsBalances = Object.values(aggregatedEarnOpportunitiesByProvider).filter(
      opportunity =>
        Boolean(includeRewardsBalances && bnOrZero(opportunity.fiatRewardsAmount).gt(0)),
    )

    return [...withEarnBalances, ...withRewardsBalances]
  },
)
