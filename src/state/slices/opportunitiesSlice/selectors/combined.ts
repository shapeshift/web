import { QueryStatus } from '@reduxjs/toolkit/query'
import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset, MarketData } from '@shapeshiftoss/types'
import BigNumber from 'bignumber.js'

import type {
  AggregatedOpportunitiesByAssetIdReturn,
  LpEarnOpportunityType,
  OpportunityId,
  StakingEarnOpportunityType,
} from '../types'
import { DefiType } from '../types'
import { getOpportunityAccessor } from '../utils'
import { selectAssets } from './../../assetsSlice/selectors'
import { selectMarketDataUserCurrency } from './../../marketDataSlice/selectors'
import { selectAggregatedEarnUserLpOpportunities } from './lpSelectors'
import {
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectUserStakingOpportunitiesWithMetadataByFilter,
} from './stakingSelectors'

import type { BN } from '@/lib/bignumber/bignumber'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import type { ReduxState } from '@/state/reducer'
import { createDeepEqualOutputSelector } from '@/state/selector-utils'
import { selectChainIdParamFromFilter } from '@/state/selectors'

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
  selectChainIdParamFromFilter,
  (
    userStakingOpportunites,
    userLpOpportunities,
    marketDataUserCurrency,
    assets,
    chainId,
  ): AggregatedOpportunitiesByAssetIdReturn[] => {
    const combined = [...userStakingOpportunites, ...userLpOpportunities]
    console.log(
      '[combined] ETH_FOX_STAKING sample:',
      JSON.stringify(
        userStakingOpportunites
          .filter(o => o.provider === 'ETH/FOX Staking')
          .slice(0, 1)
          .map(o => ({
            id: o.id,
            provider: o.provider,
            assetId: o.assetId,
            underlyingAssetId: o.underlyingAssetId,
            underlyingAssetIds: o.underlyingAssetIds,
          })),
        null,
        2,
      ),
    )
    const totalFiatAmountByAssetId: Record<AssetId, BN> = {}
    const projectedAnnualizedYieldByAssetId: Record<AssetId, BN> = {}

    const isActiveOpportunityByAssetId = combined.reduce<Record<AssetId, boolean>>((acc, cur) => {
      const depositKey = getOpportunityAccessor({ provider: cur.provider, type: cur.type })
      const underlyingAssetIds = [cur[depositKey]].flat()

      if (cur.provider === 'ETH/FOX Staking') {
        console.log(
          '[combined] ETH_FOX depositKey check:',
          JSON.stringify(
            {
              id: cur.id,
              assetId: cur.assetId,
              provider: cur.provider,
              depositKey,
              curDepositValue: cur[depositKey],
              curUnderlyingAssetId: cur.underlyingAssetId,
              curUnderlyingAssetIds: cur.underlyingAssetIds,
              underlyingAssetIds,
              allKeys: Object.keys(cur).filter(
                k => k.includes('underlying') || k.includes('asset'),
              ),
            },
            null,
            2,
          ),
        )
      }

      underlyingAssetIds.forEach(assetId => {
        const asset = assets[assetId]
        if (!asset) {
          console.warn(
            '[combined] Asset not in store:',
            JSON.stringify({
              assetId,
              opportunityId: cur.id,
              depositKey,
              curDepositValue: cur[depositKey],
            }),
          )
          return acc
        }

        const amountFiat = cur.fiatAmount

        const maybeStakingRewardsAmountUserCurrency = makeClaimableStakingRewardsAmountUserCurrency(
          {
            maybeStakingOpportunity: cur,
            marketDataUserCurrency,
            assets,
          },
        )

        if (
          !bnOrZero(amountFiat).isZero() ||
          bnOrZero(maybeStakingRewardsAmountUserCurrency).gt(0)
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
          if (!asset) {
            return acc
          }

          const amountFiat = cur.fiatAmount

          const maybeStakingRewardsAmountFiat = makeClaimableStakingRewardsAmountUserCurrency({
            maybeStakingOpportunity: cur,
            marketDataUserCurrency,
            assets,
          })

          const isActiveOpportunityByFilter =
            !bnOrZero(amountFiat).isZero() || bnOrZero(maybeStakingRewardsAmountFiat).gt(0)

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
            .plus(bnOrZero(cryptoBalancePrecision))
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

    const filtered = Object.values(byAssetId).filter(opportunity =>
      Boolean(
        bnOrZero(opportunity.fiatAmount).gt(0) || bnOrZero(opportunity.fiatRewardsAmount).gt(0),
      ),
    )

    console.log(
      '[combined] Result:',
      JSON.stringify(
        {
          beforeFilter: Object.keys(byAssetId).length,
          afterFilter: filtered.length,
          sample: filtered.slice(0, 2).map(o => ({
            assetId: o.assetId,
            fiatAmount: o.fiatAmount,
          })),
        },
        null,
        2,
      ),
    )

    return filtered
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

export const selectIsAnyOpportunitiesApiQueryPending = (state: ReduxState) =>
  Object.values(state.opportunitiesApi.queries).some(query => query?.status === QueryStatus.pending)
