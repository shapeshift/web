import type { AssetId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import { selectAssets } from '../../assetsSlice/selectors'
import { selectMarketDataSortedByMarketCap } from '../../marketDataSlice/selectors'
import type {
  AggregatedOpportunitiesByAssetIdReturn,
  OpportunityId,
  StakingEarnOpportunityType,
} from '../types'
import { getUnderlyingAssetIdsBalances } from '../utils'
import { selectAggregatedEarnUserLpOpportunities } from './lpSelectors'
import { selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty } from './stakingSelectors'

type GetOpportunityAccessorArgs = { provider: DefiProvider; type: DefiType }
type GetOpportunityAccessorReturn = 'underlyingAssetId' | 'underlyingAssetIds'
type GetOpportunityAccessor = (args: GetOpportunityAccessorArgs) => GetOpportunityAccessorReturn

const getOpportunityAccessor: GetOpportunityAccessor = ({ provider, type }) => {
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
  ): AggregatedOpportunitiesByAssetIdReturn[] => {
    const combined = [...userStakingOpportunites, ...userLpOpportunities]
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
                token_staking: [],
                vault: [],
              },
            }
          }
          const asset = assets[assetId]
          if (!asset) return acc
          acc[assetId].netApy = bnOrZero(acc[assetId].netApy).plus(cur.apy).toFixed(2)
          acc[assetId].opportunities[cur.type].push(cur.assetId as OpportunityId)
          acc[assetId].fiatRewardsAmount = '0'
          if (cur.type === DefiType.Staking) {
            const stakingOpportunity = cur as StakingEarnOpportunityType
            const rewardsAmountFiat = Array.from(stakingOpportunity.rewardAssetIds ?? []).reduce(
              (sum, assetId, index) => {
                const asset = assets[assetId]
                if (!asset) return sum
                const marketDataPrice = marketData[assetId]?.price
                const cryptoAmountPrecision = bnOrZero(
                  stakingOpportunity?.rewardsAmountsCryptoBaseUnit?.[index],
                ).div(bnOrZero(10).pow(asset?.precision))
                return bnOrZero(cryptoAmountPrecision)
                  .times(marketDataPrice ?? 0)
                  .plus(bnOrZero(sum))
                  .toNumber()
              },
              0,
            )
            acc[assetId].fiatRewardsAmount = bnOrZero(rewardsFiatAmount).toFixed(2)
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

    return Object.values(byAssetId)
  },
)
