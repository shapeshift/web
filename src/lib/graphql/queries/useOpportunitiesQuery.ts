import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'

import { getGraphQLClient } from '../client'

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

const USER_STAKING_DATA_QUERY = `
  query UserStakingData($requests: [UserStakingDataRequest!]!) {
    opportunities {
      userStakingData(requests: $requests) {
        accountId
        opportunities {
          userStakingId
          isLoaded
          stakedAmountCryptoBaseUnit
          rewardsCryptoBaseUnit {
            amounts
            claimable
          }
          dateUnlocked
        }
      }
    }
  }
`

export type DefiProvider =
  | 'THORCHAIN_SAVERS'
  | 'COSMOS_SDK'
  | 'RUNEPOOL'
  | 'RFOX'
  | 'ETH_FOX_STAKING'
  | 'SHAPE_SHIFT'
export type DefiType = 'STAKING' | 'LIQUIDITY_POOL'

export type GraphQLStakingOpportunityMetadata = {
  id: string
  provider: DefiProvider
  type: DefiType
  assetId: AssetId
  underlyingAssetId: AssetId
  underlyingAssetIds: AssetId[]
  rewardAssetIds: AssetId[]
  underlyingAssetRatiosBaseUnit: string[]
  underlyingAssetWeightPercentageDecimal: string[] | null
  apy: string | null
  tvl: string
  name: string
  icon: string | null
  isClaimableRewards: boolean
  isReadOnly: boolean | null
  expired: boolean | null
  active: boolean | null
  saversMaxSupplyFiat: string | null
  isFull: boolean | null
  group: string | null
  version: string | null
  tags: string[] | null
}

export type GraphQLStakingRewards = {
  amounts: string[]
  claimable: boolean
}

export type GraphQLUserStakingOpportunity = {
  userStakingId: string
  isLoaded: boolean
  stakedAmountCryptoBaseUnit: string
  rewardsCryptoBaseUnit: GraphQLStakingRewards
  dateUnlocked: number | null
}

export type StakingMetadataResult = {
  chainId: ChainId
  provider: DefiProvider
  opportunities: GraphQLStakingOpportunityMetadata[]
}

export type UserStakingDataResult = {
  accountId: AccountId
  opportunities: GraphQLUserStakingOpportunity[]
}

type StakingMetadataRequest = {
  chainId: ChainId
  provider: DefiProvider
}

type UserStakingDataRequest = {
  accountId: AccountId
  opportunityIds: string[]
}

export async function fetchStakingMetadata(
  requests: StakingMetadataRequest[],
): Promise<StakingMetadataResult[]> {
  if (requests.length === 0) return []

  console.log('[fetchStakingMetadata] Fetching metadata for:', {
    requestsCount: requests.length,
    requests: requests.slice(0, 3),
  })

  const client = getGraphQLClient()
  const response = await client.request<{
    opportunities: {
      stakingMetadata: StakingMetadataResult[]
    }
  }>(STAKING_METADATA_QUERY, { requests })

  console.log('[fetchStakingMetadata] Response received:', {
    resultsCount: response.opportunities.stakingMetadata.length,
    totalOpportunities: response.opportunities.stakingMetadata.reduce(
      (sum, r) => sum + r.opportunities.length,
      0,
    ),
  })

  return response.opportunities.stakingMetadata
}

export async function fetchUserStakingData(
  requests: UserStakingDataRequest[],
): Promise<UserStakingDataResult[]> {
  if (requests.length === 0) return []

  console.log('[fetchUserStakingData] Fetching data for:', {
    requestsCount: requests.length,
    accountIds: requests.map(r => r.accountId).slice(0, 3),
  })

  const client = getGraphQLClient()
  const response = await client.request<{
    opportunities: {
      userStakingData: UserStakingDataResult[]
    }
  }>(USER_STAKING_DATA_QUERY, { requests })

  console.log('[fetchUserStakingData] Response received:', {
    resultsCount: response.opportunities.userStakingData.length,
    totalOpportunities: response.opportunities.userStakingData.reduce(
      (sum, r) => sum + r.opportunities.length,
      0,
    ),
  })

  return response.opportunities.userStakingData
}

export const STAKING_METADATA_QUERY_KEY = 'staking-metadata'
export const USER_STAKING_DATA_QUERY_KEY = 'user-staking-data'

export function useStakingMetadataQuery(
  requests: StakingMetadataRequest[],
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled !== false && requests.length > 0

  return useQuery({
    queryKey: [STAKING_METADATA_QUERY_KEY, requests],
    queryFn: () => fetchStakingMetadata(requests),
    enabled,
    staleTime: 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  })
}

export function useUserStakingDataQuery(
  requests: UserStakingDataRequest[],
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled !== false && requests.length > 0

  return useQuery({
    queryKey: [USER_STAKING_DATA_QUERY_KEY, requests],
    queryFn: () => fetchUserStakingData(requests),
    enabled,
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  })
}
