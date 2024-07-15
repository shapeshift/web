import { foxAssetId, foxOnArbitrumOneAssetId } from '@shapeshiftoss/caip'

import { rFOXEthStakingIds } from '../../constants'
import type { GetOpportunityIdsOutput, GetOpportunityMetadataOutput } from '../../types'
import { DefiProvider, DefiType } from '../../types'
import type { OpportunityMetadataResolverInput } from '../types'

export const rFOXStakingMetadataResolver = async ({
  opportunityId,
  defiType,
}: OpportunityMetadataResolverInput): Promise<{
  data: GetOpportunityMetadataOutput
}> => {
  const data = {
    byId: {
      [opportunityId]: {
        assetId: opportunityId,
        id: opportunityId,
        provider: DefiProvider.rFOX,
        type: DefiType.Staking,
        underlyingAssetId: foxOnArbitrumOneAssetId,
        underlyingAssetIds: [foxOnArbitrumOneAssetId],
        underlyingAssetRatiosBaseUnit: ['0', '0'] as const,
        expired: false,
        name: 'rFOX',
        rewardAssetIds: [foxAssetId] as const,
        isClaimableRewards: true,
      },
    },
    type: defiType,
  } as const

  return await Promise.resolve({ data })
}

export const rFOXStakingOpportunityIdsResolver = (): Promise<{
  data: GetOpportunityIdsOutput
}> => Promise.resolve({ data: [...rFOXEthStakingIds] })
