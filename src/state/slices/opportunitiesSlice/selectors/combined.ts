// Don't use treeshake syntax here -- https://github.com/lodash/lodash/issues/4712
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import type { GroupedEligibleOpportunityReturnType, OpportunityId } from '../types'
import { selectAggregatedEarnUserLpOpportunities } from './lpSelectors'
import { selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty } from './stakingSelectors'

const getOpportunityAssetIds = ({ provider, type }: { provider: DefiProvider; type: DefiType }) => {
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
  (userStakingOpportunites, userLpOpportunities): GroupedEligibleOpportunityReturnType[] => {
    const combined = [...userStakingOpportunites, ...userLpOpportunities]
    const grouped = combined.reduce(
      (acc: { [key: string]: GroupedEligibleOpportunityReturnType }, curr) => {
        const depositKey = getOpportunityAssetIds({ provider: curr.provider, type: curr.type })
        const underlyingAssetIds = [curr[depositKey]].flat()
        underlyingAssetIds.forEach(assetId => {
          if (!acc[assetId]) {
            acc[assetId] = {
              assetId,
              underlyingAssetIds: curr.underlyingAssetIds,
              netApy: 0,
              balance: 0,
              cryptoBalance: 0,
              opportunities: {
                staking: [],
                lp: [],
                token_staking: [],
                vault: [],
              },
            }
          }
          acc[assetId].netApy = bnOrZero(acc[assetId].netApy).plus(curr.apy).toNumber()
          acc[assetId].balance = bnOrZero(acc[assetId].balance).plus(curr.fiatAmount).toNumber()
          acc[assetId].opportunities[curr.type].push(curr.assetId as OpportunityId)
        })
        return acc
      },
      {},
    )
    const result = Array.from(Object.values(grouped))
    return result
  },
)
