import type { ChainId } from '@shapeshiftoss/caip'

import { getGraphQLClient } from './client'
import type {
  DefiProvider,
  GraphQLStakingOpportunityMetadata,
  StakingMetadataResult,
} from './queries/useOpportunitiesQuery'

const STAKING_METADATA_QUERY = `
  query StakingMetadata($requests: [StakingMetadataRequest!]!) {
    opportunities {
      stakingMetadata(requests: $requests) {
        chainId
        provider
        opportunities {
          id
          provider
          type
          assetId
          underlyingAssetId
          underlyingAssetIds
          rewardAssetIds
          underlyingAssetRatiosBaseUnit
          underlyingAssetWeightPercentageDecimal
          apy
          tvl
          name
          icon
          isClaimableRewards
          isReadOnly
          expired
          active
          saversMaxSupplyFiat
          isFull
          group
          version
          tags
        }
      }
    }
  }
`

type StakingMetadataRequest = {
  chainId: ChainId
  provider: DefiProvider
}

export async function fetchStakingMetadataGraphQL(
  chainId: ChainId,
  provider: DefiProvider,
): Promise<GraphQLStakingOpportunityMetadata[] | null> {
  try {
    const client = getGraphQLClient()
    const requests: StakingMetadataRequest[] = [{ chainId, provider }]

    const response = await client.request<{
      opportunities: {
        stakingMetadata: StakingMetadataResult[]
      }
    }>(STAKING_METADATA_QUERY, { requests })

    const result = response.opportunities.stakingMetadata.find(
      r => r.chainId === chainId && r.provider === provider,
    )

    return result?.opportunities ?? null
  } catch (error) {
    console.error('[fetchStakingMetadataGraphQL] Failed:', error)
    return null
  }
}
