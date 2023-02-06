// Don't use treeshake syntax here -- https://github.com/lodash/lodash/issues/4712
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import { selectAssets } from '../../assetsSlice/selectors'
import { selectMarketDataSortedByMarketCap } from '../../marketDataSlice/selectors'
import type {
  GroupedEligibleOpportunityReturnType,
  OpportunityId,
  StakingEarnOpportunityType,
} from '../types'
import { getUnderlyingAssetIdsBalances } from '../utils'
import { selectAggregatedEarnUserLpOpportunities } from './lpSelectors'
import { selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty } from './stakingSelectors'

const getOpportunityAccessor = ({ provider, type }: { provider: DefiProvider; type: DefiType }) => {
  if (type === DefiType.Staking) {
    if (provider === DefiProvider.FoxFarming) {
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
  (
    userStakingOpportunites,
    userLpOpportunities,
    marketData,
    assets,
  ): GroupedEligibleOpportunityReturnType[] => {
    const combined = [...userStakingOpportunites, ...userLpOpportunities]
    const grouped = combined.reduce(
      (acc: { [key: string]: GroupedEligibleOpportunityReturnType }, curr) => {
        const depositKey = getOpportunityAccessor({ provider: curr.provider, type: curr.type })
        const underlyingAssetIds = [curr[depositKey]].flat()
        underlyingAssetIds.forEach(assetId => {
          if (!acc[assetId]) {
            acc[assetId] = {
              assetId,
              underlyingAssetIds: curr.underlyingAssetIds,
              netApy: 0,
              fiatAmount: 0,
              cryptoBalancePrecision: 0,
              rewards: 0,
              opportunities: {
                staking: [],
                lp: [],
                token_staking: [],
                vault: [],
              },
            }
          }
          const asset = assets[assetId]
          if (!asset) return acc
          acc[assetId].netApy = bnOrZero(acc[assetId].netApy).plus(curr.apy).toNumber()
          acc[assetId].opportunities[curr.type].push(curr.assetId as OpportunityId)
          acc[assetId].rewards = 0
          if (curr.type === DefiType.Staking) {
            const stakingOpportunity = curr as StakingEarnOpportunityType
            const rewardsFiatAmount = Object.values(stakingOpportunity.rewardAssetIds ?? []).reduce(
              (sum, assetId, index) => {
                const asset = assets[assetId]
                if (!asset) return sum
                const marketDataPrice = marketData[assetId]?.price
                const cryptoAmountPrecision = bnOrZero(
                  stakingOpportunity?.rewardsAmountsCryptoBaseUnit?.[index],
                ).div(bnOrZero(10).pow(asset?.precision))
                sum = bnOrZero(cryptoAmountPrecision)
                  .times(marketDataPrice ?? 0)
                  .plus(bnOrZero(sum))
                  .toNumber()
                return sum
              },
              0,
            )
            acc[assetId].rewards = rewardsFiatAmount
          }
          const underlyingAssetBalances = getUnderlyingAssetIdsBalances({
            underlyingAssetIds: curr.underlyingAssetIds,
            underlyingAssetRatiosBaseUnit: curr.underlyingAssetRatiosBaseUnit,
            cryptoAmountBaseUnit: curr.cryptoAmountBaseUnit,
            assets,
            marketData,
          })
          const cryptoBalancePrecision = bnOrZero(curr.cryptoAmountBaseUnit).div(
            bnOrZero(10).pow(asset?.precision).toString(),
          )
          acc[assetId].fiatAmount = bnOrZero(acc[assetId].fiatAmount)
            .plus(
              bnOrZero(
                curr.type === DefiType.LiquidityPool
                  ? underlyingAssetBalances[assetId].fiatAmount
                  : curr.fiatAmount,
              ),
            )
            .toNumber()
          acc[assetId].cryptoBalancePrecision = bnOrZero(acc[assetId].cryptoBalancePrecision)
            .plus(
              bnOrZero(
                curr.type === DefiType.LiquidityPool
                  ? underlyingAssetBalances[assetId].cryptoBalancePrecision
                  : cryptoBalancePrecision,
              ),
            )
            .toNumber()
        })
        return acc
      },
      {},
    )
    const result = Array.from(Object.values(grouped))
    return result
  },
)
