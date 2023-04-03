import { QueryStatus } from '@reduxjs/toolkit/dist/query'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import BigNumber from 'bignumber.js'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import isEmpty from 'lodash/isEmpty'
import type { BN } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import {
  selectChainIdParamFromFilter,
  selectIncludeEarnBalancesParamFromFilter,
  selectIncludeRewardsBalancesParamFromFilter,
} from 'state/selectors'

import { selectAssets } from '../../assetsSlice/selectors'
import { selectMarketDataSortedByMarketCap } from '../../marketDataSlice/selectors'
import type {
  AggregatedOpportunitiesByAssetIdReturn,
  AggregatedOpportunitiesByProviderReturn,
  LpEarnOpportunityType,
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

const makeClaimableStakingRewardsAmountFiat = ({
  assets,
  maybeStakingOpportunity,
  marketData,
}: {
  assets: Partial<Record<AssetId, Asset>>
  marketData: Partial<Record<AssetId, MarketData>>
  maybeStakingOpportunity: StakingEarnOpportunityType | LpEarnOpportunityType
}): number => {
  if (maybeStakingOpportunity.type !== DefiType.Staking) return 0

  const stakingOpportunity = maybeStakingOpportunity as StakingEarnOpportunityType

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

  return rewardsAmountFiat
}
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
  selectChainIdParamFromFilter,
  (
    userStakingOpportunites,
    userLpOpportunities,
    marketData,
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
          marketData,
        })

        const amountFiat =
          cur.type === DefiType.LiquidityPool
            ? underlyingAssetBalances[assetId].fiatAmount
            : cur.fiatAmount

        const maybeStakingRewardsAmountFiat = makeClaimableStakingRewardsAmountFiat({
          maybeStakingOpportunity: cur,
          marketData,
          assets,
        })

        if (
          (!includeEarnBalances && !includeRewardsBalances) ||
          (includeEarnBalances && bnOrZero(amountFiat).gt(0)) ||
          (includeRewardsBalances && bnOrZero(maybeStakingRewardsAmountFiat).gt(0))
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
              apy: '0',
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
            marketData,
          })

          const amountFiat =
            cur.type === DefiType.LiquidityPool
              ? underlyingAssetBalances[assetId].fiatAmount
              : cur.fiatAmount

          const maybeStakingRewardsAmountFiat = makeClaimableStakingRewardsAmountFiat({
            maybeStakingOpportunity: cur,
            marketData,
            assets,
          })

          const isActiveOpportunityByFilter =
            (!includeEarnBalances && !includeRewardsBalances) ||
            (includeEarnBalances && bnOrZero(amountFiat).gt(0)) ||
            (includeRewardsBalances && bnOrZero(maybeStakingRewardsAmountFiat).gt(0))

          acc[assetId].fiatRewardsAmount = bnOrZero(maybeStakingRewardsAmountFiat)
            .plus(acc[assetId].fiatRewardsAmount)
            .toFixed(2)

          if (isActiveOpportunityByFilter) {
            acc[assetId].opportunities[cur.type].push(cur.id as OpportunityId)
          }

          const cryptoBalancePrecision = bnOrZero(cur.cryptoAmountBaseUnit).div(
            bnOrZero(10).pow(asset?.precision).toString(),
          )
          acc[assetId].fiatAmount = bnOrZero(acc[assetId].fiatAmount)
            .plus(bnOrZero(amountFiat))
            .toFixed(2)

          // No active staking for the current AssetId, show the highest APY
          if (!isActiveAssetId) {
            acc[assetId].apy = BigNumber.maximum(acc[assetId].apy, cur.apy).toFixed()
          } else if (isActiveOpportunityByFilter) {
            totalFiatAmountByAssetId[assetId] = bnOrZero(totalFiatAmountByAssetId[assetId]).plus(
              amountFiat,
            )
            projectedAnnualizedYieldByAssetId[assetId] = bnOrZero(
              projectedAnnualizedYieldByAssetId[assetId],
            ).plus(bnOrZero(amountFiat).times(cur.apy))
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

    if (!includeEarnBalances && !includeRewardsBalances) return aggregatedEarnOpportunitiesByAssetId

    const withEarnBalances = aggregatedEarnOpportunitiesByAssetId.filter(opportunity =>
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

export const selectOpportunityApiPending = (state: ReduxState) =>
  Object.values(state.opportunitiesApi.queries).some(query => query?.status === QueryStatus.pending)

export const selectAggregatedEarnOpportunitiesByProvider = createDeepEqualOutputSelector(
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectAggregatedEarnUserLpOpportunities,
  selectMarketDataSortedByMarketCap,
  selectAssets,
  selectIncludeEarnBalancesParamFromFilter,
  selectIncludeRewardsBalancesParamFromFilter,
  selectChainIdParamFromFilter,
  (
    userStakingOpportunites,
    userLpOpportunities,
    marketData,
    assets,
    includeEarnBalances,
    includeRewardsBalances,
    chainId,
  ): AggregatedOpportunitiesByProviderReturn[] => {
    if (isEmpty(marketData)) return []
    const totalFiatAmountByProvider = {} as Record<DefiProvider, BN>
    const projectedAnnualizedYieldByProvider = {} as Record<DefiProvider, BN>
    const combined = [...userStakingOpportunites, ...userLpOpportunities]

    const makeEmptyPayload = (provider: DefiProvider): AggregatedOpportunitiesByProviderReturn => ({
      provider,
      apy: '0',
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

    const isActiveStakingByFilter = combined.reduce<Record<DefiProvider, boolean>>((acc, cur) => {
      const { provider } = cur

      if (chainId && chainId !== cur.chainId) return acc

      const maybeStakingRewardsAmountFiat = makeClaimableStakingRewardsAmountFiat({
        maybeStakingOpportunity: cur,
        marketData,
        assets,
      })

      const isActiveOpportunityByFilter =
        (!includeEarnBalances && !includeRewardsBalances) ||
        (includeEarnBalances && bnOrZero(cur.fiatAmount).gt(0)) ||
        (includeRewardsBalances && bnOrZero(maybeStakingRewardsAmountFiat).gt(0))

      if (isActiveOpportunityByFilter) {
        acc[provider] = true
        return acc
      }

      return acc
    }, {} as Record<DefiProvider, boolean>)

    const byProvider = combined.reduce<
      Record<DefiProvider, AggregatedOpportunitiesByProviderReturn>
    >((acc, cur) => {
      const { provider } = cur
      const isActiveProvider = isActiveStakingByFilter[provider]

      if (chainId && chainId !== cur.chainId) return acc

      const maybeStakingRewardsAmountFiat = makeClaimableStakingRewardsAmountFiat({
        maybeStakingOpportunity: cur,
        marketData,
        assets,
      })

      const isActiveOpportunityByFilter =
        (!includeEarnBalances && !includeRewardsBalances) ||
        (includeEarnBalances && bnOrZero(cur.fiatAmount).gt(0)) ||
        (includeRewardsBalances && bnOrZero(maybeStakingRewardsAmountFiat).gt(0))
      // No active staking for the current provider, show the highest APY
      if (!isActiveProvider) {
        acc[provider].apy = BigNumber.maximum(acc[provider].apy, cur.apy).toFixed()
      } else if (isActiveOpportunityByFilter) {
        totalFiatAmountByProvider[provider] = bnOrZero(totalFiatAmountByProvider[provider]).plus(
          cur.fiatAmount,
        )
        projectedAnnualizedYieldByProvider[provider] = bnOrZero(
          projectedAnnualizedYieldByProvider[provider],
        ).plus(bnOrZero(cur.fiatAmount).times(cur.apy))
      }

      if (cur.type === DefiType.LiquidityPool) {
        acc[provider].opportunities.lp.push(cur.id)
      }

      if (isActiveOpportunityByFilter) {
        acc[provider].opportunities.staking.push(cur.id)
      }

      acc[provider].fiatRewardsAmount = bnOrZero(maybeStakingRewardsAmountFiat)
        .plus(acc[provider].fiatRewardsAmount)
        .toFixed(2)

      acc[provider].fiatAmount = bnOrZero(acc[provider].fiatAmount)
        .plus(bnOrZero(cur.fiatAmount))
        .toFixed(2)

      return acc
    }, initial)

    for (const [provider, totalVirtualFiatAmount] of Object.entries(totalFiatAmountByProvider)) {
      // Use the highest APY for inactive opportunities
      if (!isActiveStakingByFilter[provider as DefiProvider]) continue
      const apy = bnOrZero(projectedAnnualizedYieldByProvider[provider as DefiProvider]).div(
        totalVirtualFiatAmount,
      )
      byProvider[provider as DefiProvider].apy = apy.toFixed()
    }

    const aggregatedEarnOpportunitiesByProvider = Object.values(byProvider).reduce<
      AggregatedOpportunitiesByProviderReturn[]
    >((acc, cur) => {
      if (cur.opportunities.lp.length || cur.opportunities.staking.length) acc.push(cur)
      return acc
    }, [])

    if (!includeEarnBalances && !includeRewardsBalances)
      return Object.values(aggregatedEarnOpportunitiesByProvider)

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
